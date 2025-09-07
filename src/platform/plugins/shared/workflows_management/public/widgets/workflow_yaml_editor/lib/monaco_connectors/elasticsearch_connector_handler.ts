/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/monaco';
import type { HttpSetup, NotificationsSetup } from '@kbn/core/public';
import { BaseMonacoConnectorHandler } from './base_monaco_connector_handler';
import { getElasticsearchRequestInfo } from '../elasticsearch_step_utils';
import type {
  HoverContext,
  ActionContext,
  ActionInfo,
  ConnectorExamples,
} from '../monaco_providers/provider_interfaces';

/**
 * Monaco connector handler for Elasticsearch APIs
 * Provides Monaco editor extensions (hover, actions, etc.) for Elasticsearch connector types
 */
export class ElasticsearchMonacoConnectorHandler extends BaseMonacoConnectorHandler {
  private readonly http?: HttpSetup;
  private readonly notifications?: NotificationsSetup;
  private readonly esHost?: string;
  private readonly kibanaHost?: string;

  constructor(
    options: {
      http?: HttpSetup;
      notifications?: NotificationsSetup;
      esHost?: string;
      kibanaHost?: string;
    } = {}
  ) {
    super('ElasticsearchMonacoConnectorHandler', 100, ['elasticsearch.']);
    this.http = options.http;
    this.notifications = options.notifications;
    this.esHost = options.esHost;
    this.kibanaHost = options.kibanaHost;
  }

  /**
   * Generate hover content for Elasticsearch connectors
   */
  async generateHoverContent(context: HoverContext): Promise<monaco.IMarkdownString | null> {
    try {
      const { connectorType, stepContext } = context;

      if (!stepContext) {
        return null;
      }

      // Get Elasticsearch request information
      const withParams = this.extractWithParams(stepContext.stepNode);
      const requestInfo = getElasticsearchRequestInfo(connectorType, withParams);

      // Generate console format
      const consoleFormat = this.generateConsoleFormat(requestInfo, withParams);

      // Create hover content - simplified and focused
      const content = [
        `**Elasticsearch API**: \`${requestInfo.method} ${requestInfo.url}\``,
        '',
        `Execute ${requestInfo.method} request to ${requestInfo.url}`,
        '',
        '**Console Format:**',
        '```http',
        consoleFormat,
        '```',
        '',
        '_💡 Position cursor on this step to see action buttons_',
        '',
      ].join('\n');

      return this.createMarkdownContent(content);
    } catch (error) {
      console.warn('ElasticsearchMonacoConnectorHandler: Error generating hover content', error);
      return null;
    }
  }

  /**
   * Generate floating action buttons for Elasticsearch connectors
   */
  async generateActions(context: ActionContext): Promise<ActionInfo[]> {
    const actions: ActionInfo[] = [];

    // Add "Copy as Console" action if we have the necessary services
    if (this.http && this.notifications) {
      actions.push(
        this.createActionInfo(
          'copy-as-console',
          'Copy as Console',
          () => this.copyAsConsole(context),
          {
            icon: 'copy',
            tooltip: 'Copy this step as Console command',
            priority: 10,
          }
        )
      );
    }

    return actions;
  }

  /**
   * Get examples for Elasticsearch connector types
   */
  getExamples(connectorType: string): ConnectorExamples | null {
    // Extract API name for examples
    const apiName = connectorType.replace('elasticsearch.', '');

    // Common Elasticsearch examples
    const commonExamples: Record<string, ConnectorExamples> = {
      search: {
        params: {
          index: 'logs-*',
          query: {
            range: {
              '@timestamp': {
                gte: 'now-1h',
              },
            },
          },
          size: 10,
        },
        snippet: `- name: search_recent_logs
  type: elasticsearch.search
  with:
    index: "logs-*"
    query:
      range:
        "@timestamp":
          gte: "now-1h"
    size: 10`,
      },
      'indices.create': {
        params: {
          index: 'my-new-index',
          body: {
            settings: {
              number_of_shards: 1,
              number_of_replicas: 0,
            },
          },
        },
        snippet: `- name: create_index
  type: elasticsearch.indices.create
  with:
    index: "my-new-index"
    body:
      settings:
        number_of_shards: 1
        number_of_replicas: 0`,
      },
      index: {
        params: {
          index: 'my-index',
          id: 'doc-1',
          body: {
            title: 'Example Document',
            content: 'This is an example document',
            timestamp: '{{ now }}',
          },
        },
        snippet: `- name: index_document
  type: elasticsearch.index
  with:
    index: "my-index"
    id: "doc-1"
    body:
      title: "Example Document"
      content: "This is an example document"
      timestamp: "{{ now }}"`,
      },
    };

    return commonExamples[apiName] || null;
  }

  /**
   * Extract 'with' parameters from step node
   */
  private extractWithParams(stepNode: any): Record<string, any> {
    const withParams: Record<string, any> = {};

    try {
      if (stepNode?.items) {
        for (const item of stepNode.items) {
          if (item.key?.value === 'with' && item.value?.items) {
            for (const withItem of item.value.items) {
              if (withItem.key?.value) {
                const key = withItem.key.value;
                const value = withItem.value?.value || withItem.value?.toJSON?.() || withItem.value;
                withParams[key] = value;
              }
            }
            break;
          }
        }
      }
    } catch (error) {
      console.warn('ElasticsearchMonacoConnectorHandler: Error extracting with params', error);
    }

    return withParams;
  }

  /**
   * Generate console format for the request
   */
  private generateConsoleFormat(
    requestInfo: { method: string; url: string; data?: string[] },
    withParams: Record<string, any>
  ): string {
    const lines = [`${requestInfo.method} ${requestInfo.url}`];

    if (requestInfo.data && requestInfo.data.length > 0) {
      lines.push(...requestInfo.data);
    }

    return lines.join('\n');
  }

  /**
   * Copy step as Console command
   */
  private async copyAsConsole(context: ActionContext): Promise<void> {
    try {
      const { connectorType, stepContext } = context;
      if (!stepContext) return;

      const withParams = this.extractWithParams(stepContext.stepNode);
      const requestInfo = getElasticsearchRequestInfo(connectorType, withParams);
      const consoleFormat = this.generateConsoleFormat(requestInfo, withParams);

      await navigator.clipboard.writeText(consoleFormat);

      if (this.notifications) {
        this.notifications.toasts.addSuccess({
          title: 'Copied to clipboard',
          text: 'Console command copied successfully',
        });
      }
    } catch (error) {
      console.error('ElasticsearchMonacoConnectorHandler: Error copying as console', error);
      if (this.notifications) {
        this.notifications.toasts.addError(error as Error, {
          title: 'Failed to copy',
        });
      }
    }
  }
}
