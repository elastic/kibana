/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { YAMLMap } from 'yaml';
import { isMap, isScalar } from 'yaml';
import type { HttpSetup, NotificationsStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { monaco } from '@kbn/monaco';
import type { InternalConnectorContract } from '@kbn/workflows';
import { buildElasticsearchRequest, isInternalConnector } from '@kbn/workflows';
import { BaseMonacoConnectorHandler } from './base_monaco_connector_handler';
import { getAllConnectors } from '../../../../../common/schema';
import type { ConnectorExamples, HoverContext } from '../monaco_providers/provider_interfaces';

interface ElasticsearchRequestInfo {
  method: string;
  url: string;
  data?: string[];
}

/**
 * Monaco connector handler for Elasticsearch APIs
 * Provides hover information for Elasticsearch connector types
 */
export class ElasticsearchMonacoConnectorHandler extends BaseMonacoConnectorHandler {
  constructor(
    options: {
      http?: HttpSetup;
      notifications?: NotificationsStart;
    } = {}
  ) {
    super('ElasticsearchMonacoConnectorHandler', 100, ['elasticsearch.']);
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
      const requestInfo = this.getElasticsearchRequestInfo(connectorType, withParams);

      // Get connector contract
      const connector = this.getConnectorContract(connectorType);
      if (!connector) {
        return null;
      }

      // Get documentation URL from connector definition
      const documentationUrl = this.getDocumentationUrl(connector);

      // Generate console format
      const consoleFormat = this.generateConsoleFormat(requestInfo, withParams);

      // Create hover content with enhanced formatting and shadowed icons
      const content = [
        `**Endpoint**: \`${requestInfo.method} ${requestInfo.url}\``,
        '',
        this.getDescription(connector, requestInfo),
        '',
        documentationUrl
          ? `<span style="text-shadow: 0 0 6px rgba(255,165,0,0.6); opacity: 0.8;">📖</span> **Documentation** \n\n [${documentationUrl}](${documentationUrl}) (Opens in new tab)`
          : '',
        documentationUrl ? '' : '',
        `**Console Format**`,
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
  private extractWithParams(stepNode: YAMLMap): Record<string, unknown> {
    const withParams: Record<string, unknown> = {};

    try {
      if (!stepNode.items) {
        return withParams;
      }

      for (const item of stepNode.items) {
        if (isScalar(item.key) && item.key.value === 'with' && isMap(item.value)) {
          for (const withItem of item.value.items) {
            if (isScalar(withItem.key) && withItem.key.value) {
              const key = withItem.key.value;
              const value =
                (isScalar(withItem.value) && withItem.value.value) ||
                (isMap(withItem.value) && withItem.value.toJSON?.()) ||
                withItem.value;
              withParams[key as string] = value;
            }
          }
          break;
        }
      }
    } catch (error) {
      // console.warn('ElasticsearchMonacoConnectorHandler: Error extracting with params', error);
    }

    return withParams;
  }

  /**
   * Get Elasticsearch request info using the shared buildRequestFromConnector utility
   */
  private getElasticsearchRequestInfo(
    stepType: string,
    withParams?: Record<string, unknown>
  ): ElasticsearchRequestInfo {
    const { method, path, body } = buildElasticsearchRequest(stepType, withParams || {});

    return {
      method,
      url: decodeURIComponent(path),
      data: body ? [JSON.stringify(body, null, 2)] : undefined,
    };
  }

  private getConnectorContract(connectorType: string): InternalConnectorContract | null {
    const allConnectors = getAllConnectors();
    if (!allConnectors) {
      return null;
    }
    const connector = allConnectors.find((c) => c.type === connectorType);
    if (!connector || !isInternalConnector(connector)) {
      return null;
    }
    return connector;
  }

  private getDescription(
    connector: InternalConnectorContract,
    requestInfo: ElasticsearchRequestInfo
  ): string | null {
    if (connector.description) {
      // Remove "Documentation: " from the description as we add it manually to hover content
      return connector.description.replace(/Documentation: .*$/, '');
    }
    return i18n.translate('xpack.workflows.monaco.elasticsearch.connector.fallbackDescription', {
      defaultMessage: 'Execute {{method}} request to {{path}}',
      values: {
        method: requestInfo.method,
        path: requestInfo.url,
      },
    });
  }

  /**
   * Get documentation URL for the connector type
   */
  private getDocumentationUrl(connector: InternalConnectorContract): string | null {
    try {
      if (connector.documentation) {
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

  /**
   * Generate console format for the request
   */
  private generateConsoleFormat(
    requestInfo: { method: string; url: string; data?: string[] },
    withParams: Record<string, unknown>
  ): string {
    const lines = [`${requestInfo.method} ${requestInfo.url}`];

    if (requestInfo.data && requestInfo.data.length > 0) {
      lines.push(...requestInfo.data);
    }

    return lines.join('\n');
  }
}
