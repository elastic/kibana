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
import { getAllConnectors } from '../../../../../common/schema';
import type {
  HoverContext,
  ActionContext,
  ActionInfo,
  ConnectorExamples,
} from '../monaco_providers/provider_interfaces';

// Cache for connectors (they don't change during runtime)
let allConnectorsCache: any[] | null = null;

function getCachedAllConnectors(): any[] {
  if (allConnectorsCache === null) {
    allConnectorsCache = getAllConnectors(); // Now uses lazy loading with require()
  }
  return allConnectorsCache;
}

/**
 * Monaco connector handler for Elasticsearch APIs
 * Provides Monaco editor extensions (hover, actions, etc.) for Elasticsearch connector types
 */
export class ElasticsearchMonacoConnectorHandler extends BaseMonacoConnectorHandler {
  private readonly http?: HttpSetup;
  private readonly notifications?: NotificationsSetup;
  // private readonly esHost?: string;
  // private readonly kibanaHost?: string;

  constructor(
    options: {
      http?: HttpSetup;
      notifications?: NotificationsSetup;
      // esHost?: string;
      // kibanaHost?: string;
    } = {}
  ) {
    super('ElasticsearchMonacoConnectorHandler', 100, ['elasticsearch.']);
    this.http = options.http;
    this.notifications = options.notifications;
    // this.esHost = options.esHost;
    // this.kibanaHost = options.kibanaHost;
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

      // Get documentation URL from connector definition
      const documentationUrl = this.getDocumentationUrl(connectorType);

      // Generate console format
      const consoleFormat = this.generateConsoleFormat(requestInfo, withParams);

      // Create hover content with enhanced formatting and shadowed icons
      const content = [
        `**Endpoint**: \`${requestInfo.method} ${requestInfo.url}\``,
        '',
        `**Description**: Execute ${requestInfo.method} request to ${requestInfo.url}`,
        '',
        documentationUrl
          ? `<span style="text-shadow: 0 0 6px rgba(255,165,0,0.6); opacity: 0.8;">📖</span> **[View API Documentation](${documentationUrl})** - Opens in new tab`
          : '',
        documentationUrl ? '' : '',
        `### <span style="text-shadow: 0 0 4px rgba(0,200,0,0.4); opacity: 0.8;">⚡</span> Console Format`,
        '```http',
        consoleFormat,
        '```',
        '',
        '',
        '---',
        `<span style="text-shadow: 0 0 3px rgba(255,255,0,0.4); opacity: 0.7;">💡</span> _Click Ctrl+Space (Ctrl+I on Mac) inside the "with:" block to see all available options_`,
      ]
        .filter((line) => line !== null)
        .join('\n');

      return this.createMarkdownContent(content);
    } catch (error) {
      // console.warn('ElasticsearchMonacoConnectorHandler: Error generating hover content', error);
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
      // console.warn('ElasticsearchMonacoConnectorHandler: Error extracting with params', error);
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
      // console.error('ElasticsearchMonacoConnectorHandler: Error copying as console', error);
      if (this.notifications) {
        this.notifications.toasts.addError(error as Error, {
          title: 'Failed to copy',
        });
      }
    }
  }

  /**
   * Get documentation URL for the connector type
   */
  private getDocumentationUrl(connectorType: string): string | null {
    try {
      const allConnectors = getCachedAllConnectors();
      if (!allConnectors) return null;
      const connector = allConnectors.find((c: any) => c.type === connectorType);

      if (connector?.documentation) {
        // Similar to Console, replace version placeholders with current version
        let docUrl = connector.documentation;

        // Replace common version placeholders with 'current' for stable links
        docUrl = docUrl.replace('/master/', '/current/').replace('/{branch}/', '/current/');

        return docUrl;
      }

      return null;
    } catch (error) {
      // console.warn('ElasticsearchMonacoConnectorHandler: Error getting documentation URL', error);
      return null;
    }
  }
}
