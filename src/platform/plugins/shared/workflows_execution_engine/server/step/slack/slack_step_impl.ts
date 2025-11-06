/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SlackSearchNode } from '@kbn/workflows/graph/types/nodes/base';
import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
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
    fields?: string;
    body?: any;
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
    const { bearerToken, query, fields } = this.step.with;

    return this.stepExecutionRuntime.contextManager.renderValueAccordingToContext({
      bearerToken,
      query,
      fields,
    });
  }

  protected async _run(input: any): Promise<RunStepResult> {
    try {
      const pageSize = 100;
      const { bearerToken, query, fields } = input;
      const allMessages: Array<SlackMessageMatch> = [];
      let page = 1;
      while (true) {
        const config: AxiosRequestConfig = {
          url: `https://slack.com/api/search.messages?query=${query}&count=${pageSize}&page=${page}`,
          method: 'GET',
          headers: {
            Authorization: `Bearer ${bearerToken}`,
          },
          signal: this.stepExecutionRuntime.abortController.signal,
        };

        const response: AxiosResponse = await axios<SlackMessageSearchResult>(config);
        const transformer = this.transformMessageReturn(fields);
        allMessages.push(...response.data.messages.matches.map(transformer));
        if (page >= response.data.messages.paging.pages) {
          break;
        }
        page += 1;
      }

      console.log(allMessages);

      return {
        input,
        output: {
          count: allMessages.length,
          allMessages,
        },
        error: undefined,
      };
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
}
