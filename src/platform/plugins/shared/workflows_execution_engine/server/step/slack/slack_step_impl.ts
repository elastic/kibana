/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import type { SlackSearchNode } from '@kbn/workflows/graph/types/nodes/base';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger/workflow_event_logger';
import type { BaseStep, RunStepResult } from '../node_implementation';
import { BaseAtomicNodeImplementation } from '../node_implementation';

// Extend BaseStep for HTTP-specific properties
export interface SlackSearchStep extends BaseStep {
  with: {
    bearerToken: string;
    query: string;
    searchType?: 'messages' | 'channels';
    fields?: string;
    body?: unknown;
  };
}

interface SlackMessageMatch {
  type: string;
  user: string;
  text: string;
  ts: string;
  channel: {
    id: string;
    name: string;
  };
  permalink: string;
}

interface SlackMessageSearchResult {
  ok: boolean;
  messages: {
    total: number;
    pagination: {
      total_count: number;
      page: number;
      pages: number;
      items_on_page: number;
    };
    matches: Array<SlackMessageMatch>;
  };
}

interface SlackChannel {
  id: string;
  name: string;
  is_channel: boolean;
  is_group: boolean;
  is_im: boolean;
  is_private: boolean;
  is_archived: boolean;
  is_general: boolean;
  created: number;
  creator: string;
  num_members?: number;
  topic?: {
    value: string;
    creator: string;
    last_set: number;
  };
  purpose?: {
    value: string;
    creator: string;
    last_set: number;
  };
}

interface SlackChannelsListResult {
  ok: boolean;
  channels: Array<SlackChannel>;
  response_metadata?: {
    next_cursor?: string;
  };
}

interface SlackSearchInput {
  bearerToken: string;
  query: string;
  searchType?: 'messages' | 'channels';
  fields?: string;
}

export class SlackSearchStepImpl extends BaseAtomicNodeImplementation<SlackSearchStep> {
  constructor(
    node: SlackSearchNode,
    stepExecutionRuntime: StepExecutionRuntime,
    private workflowLogger: IWorkflowEventLogger,
    workflowRuntime: WorkflowExecutionRuntimeManager
  ) {
    const slackSearchStep: SlackSearchStep = {
      name: node.configuration.name,
      type: node.type,
      spaceId: '', // TODO: get from context or node
      with: node.configuration.with,
    };
    super(
      slackSearchStep,
      stepExecutionRuntime,
      undefined, // no connector executor needed for HTTP
      workflowRuntime
    );
  }

  public getInput() {
    const { bearerToken, query, searchType, fields } = this.step.with;

    return this.stepExecutionRuntime.contextManager.renderValueAccordingToContext({
      bearerToken,
      query,
      searchType,
      fields,
    });
  }

  protected async _run(input: SlackSearchInput): Promise<RunStepResult> {
    try {
      // Resolve secrets in input (e.g., ${workplace_connector:id:api_key})
      const resolvedInput =
        await this.stepExecutionRuntime.contextManager.resolveSecretsInValue<SlackSearchInput>(
          input
        );
      const { bearerToken, query, searchType = 'messages', fields } = resolvedInput;

      if (searchType === 'channels') {
        return await this.searchChannels(bearerToken, query, fields, resolvedInput);
      } else {
        return await this.searchMessages(bearerToken, query, fields, resolvedInput);
      }
    } catch (error) {
      let errorMessage: string;
      let isAborted = false;
      if (error instanceof Error) {
        errorMessage = error.message;
        // Check if this is an AbortError
        if (error.name === 'AbortError') {
          isAborted = true;
        }
      } else {
        errorMessage = String(error);
      }

      this.workflowLogger.logError(
        `Slack search failed: ${errorMessage}`,
        error instanceof Error ? error : new Error(errorMessage),
        {
          workflow: { step_id: this.step.name },
          event: { action: 'http_request', outcome: 'failure' },
          tags: isAborted ? ['http', 'cancelled'] : ['http', 'error'],
        }
      );

      return {
        input,
        output: undefined,
        error: errorMessage,
      };
    }
  }

  private async searchMessages(
    bearerToken: string,
    query: string,
    fields: string | undefined,
    input: SlackSearchInput
  ): Promise<RunStepResult> {
    const pageSize = 100;
    const allMessages: Array<SlackMessageMatch> = [];
    let page = 1;
    while (true) {
      const config: AxiosRequestConfig = {
        url: `https://slack.com/api/search.messages?query=${encodeURIComponent(
          query
        )}&count=${pageSize}&page=${page}`,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
        signal: this.stepExecutionRuntime.abortController.signal,
      };

      const response: AxiosResponse = await axios<SlackMessageSearchResult>(config);

      if (!response.data.ok) {
        const error = response.data.error || 'Unknown error';
        let errorMessage = `Slack API error: ${error}`;

        // Provide helpful guidance for missing_scope errors
        if (error === 'missing_scope') {
          errorMessage +=
            '. The Slack token requires the search:read OAuth scope. Please re-authenticate with the correct scope.';
        }

        throw new Error(errorMessage);
      }

      const transformer = this.transformMessageReturn(fields);
      allMessages.push(...response.data.messages.matches.map(transformer));
      if (page >= response.data.messages.paging.pages) {
        break;
      }
      page += 1;
    }

    return {
      input,
      output: {
        count: allMessages.length,
        messages: allMessages,
      },
      error: undefined,
    };
  }

  private async searchChannels(
    bearerToken: string,
    query: string,
    fields: string | undefined,
    input: SlackSearchInput
  ): Promise<RunStepResult> {
    const allChannels: Array<SlackChannel> = [];
    let cursor: string | undefined;
    // Use conversations.list to get all channels, then filter by query
    while (true) {
      const params = new URLSearchParams({
        types: 'public_channel,private_channel',
        limit: '1000',
      });
      if (cursor) {
        params.append('cursor', cursor);
      }

      const config: AxiosRequestConfig = {
        url: `https://slack.com/api/conversations.list?${params.toString()}`,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
        signal: this.stepExecutionRuntime.abortController.signal,
      };

      const response: AxiosResponse = await axios<SlackChannelsListResult>(config);

      if (!response.data.ok) {
        const error = response.data.error || 'Unknown error';
        let errorMessage = `Slack API error: ${error}`;

        // Provide helpful guidance for missing_scope errors
        if (error === 'missing_scope') {
          errorMessage +=
            '. The Slack token requires the following OAuth scopes: channels:read (for public channels) and groups:read (for private channels). Please re-authenticate with the correct scopes.';
        }

        throw new Error(errorMessage);
      }

      // Filter channels by query (case-insensitive search in name, topic, and purpose)
      const queryLower = query.toLowerCase();
      const matchingChannels = response.data.channels.filter((channel: SlackChannel) => {
        const nameMatch = channel.name.toLowerCase().includes(queryLower);
        const topicMatch = channel.topic?.value.toLowerCase().includes(queryLower);
        const purposeMatch = channel.purpose?.value.toLowerCase().includes(queryLower);
        return nameMatch || topicMatch || purposeMatch;
      });

      allChannels.push(...matchingChannels);

      cursor = response.data.response_metadata?.next_cursor;
      if (!cursor) {
        break;
      }
    }

    const transformedChannels = allChannels.map(this.transformChannelReturn(fields));

    return {
      input,
      output: {
        count: transformedChannels.length,
        channels: transformedChannels,
      },
      error: undefined,
    };
  }

  protected transformMessageReturn = (fields?: string) => (match: SlackMessageMatch) => {
    // First create the full normalized object
    const full = {
      user: match.user,
      text: match.text,
      ts: match.ts,
      channel: {
        id: match.channel.id,
        name: match.channel.name,
      },
      permalink: match.permalink,
    };

    // If no field filtering requested, return full object
    if (!fields || fields === '') return full;

    // Convert comma-separated list to a Set for efficient lookup
    const allow = new Set(fields.split(',').map((f) => f.trim()));

    // Now build a filtered output object — *shallow filtering*
    return Object.fromEntries(Object.entries(full).filter(([key]) => allow.has(key)));
  };

  protected transformChannelReturn = (fields?: string) => (channel: SlackChannel) => {
    // First create the full normalized object
    const full = {
      id: channel.id,
      name: channel.name,
      is_channel: channel.is_channel,
      is_private: channel.is_private,
      is_archived: channel.is_archived,
      num_members: channel.num_members,
      topic: channel.topic?.value || '',
      purpose: channel.purpose?.value || '',
      created: channel.created,
    };

    // If no field filtering requested, return full object
    if (!fields || fields === '') return full;

    // Convert comma-separated list to a Set for efficient lookup
    const allow = new Set(fields.split(',').map((f) => f.trim()));

    // Now build a filtered output object — *shallow filtering*
    return Object.fromEntries(Object.entries(full).filter(([key]) => allow.has(key)));
  };
}
