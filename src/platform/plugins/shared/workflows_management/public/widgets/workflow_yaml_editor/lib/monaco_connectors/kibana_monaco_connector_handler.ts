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
import type { monaco } from '@kbn/monaco';
import type { InternalConnectorContract } from '@kbn/workflows';
import { isInternalConnector } from '@kbn/workflows';
import { BaseMonacoConnectorHandler } from './base_monaco_connector_handler';
import { getAllConnectors } from '../../../../../common/schema';
import type { ConnectorExamples, HoverContext } from '../monaco_providers/provider_interfaces';

/**
 * Monaco connector handler for Kibana APIs
 * Provides hover information for Kibana connector types
 */
export class KibanaMonacoConnectorHandler extends BaseMonacoConnectorHandler {
  // private readonly kibanaHost?: string;
  private readonly connectorExamples: Map<string, ConnectorExamples>;

  constructor(
    options: {
      http?: HttpSetup;
      notifications?: NotificationsStart;
      kibanaHost?: string;
      generatedConnectors?: Array<{
        type: string;
        description?: string;
        examples?: ConnectorExamples;
        methods?: string[];
        patterns?: string[];
      }>;
    } = {}
  ) {
    super('KibanaMonacoConnectorHandler', 90, ['kibana.']);
    // this.kibanaHost = options.kibanaHost;
    this.connectorExamples = new Map();

    // Process generated connectors to extract examples
    if (options.generatedConnectors) {
      this.processGeneratedConnectors(options.generatedConnectors);
    }
  }

  /**
   * Generate hover content for Kibana connectors
   */
  async generateHoverContent(context: HoverContext): Promise<monaco.IMarkdownString | null> {
    try {
      const { connectorType, stepContext } = context;

      if (!stepContext) {
        return null;
      }

      // Get connector information from schema
      const connector = this.getConnectorInfo(connectorType);
      const withParams = this.extractWithParams(stepContext.stepNode);

      if (!connector) {
        return null;
      }

      // Extract API information from connector type
      const apiInfo = this.parseKibanaConnectorType(connectorType, connector);
      if (!apiInfo) {
        return null;
      }

      // Get documentation URL from connector definition
      const documentationUrl = this.getDocumentationUrl(connector);

      // Get examples for this connector
      const examples = this.getExamples(connectorType);

      // Generate request example
      const requestExample = this.generateRequestExample(apiInfo, withParams);

      // Create enhanced hover content with enhanced formatting and shadowed icons
      const content = [
        `**Endpoint**: \`${apiInfo.method} ${apiInfo.path}\``,
        '',
        apiInfo.description || `Execute ${apiInfo.method} request to ${apiInfo.path}`,
        '',
        documentationUrl
          ? `<span style="text-shadow: 0 0 6px rgba(255,165,0,0.6); opacity: 0.8;">📖</span> **Documentation** \n\n [${documentationUrl}](${documentationUrl}) (Opens in new tab)`
          : '',
        documentationUrl ? '' : '',
        `**Request Example**`,
        '',
        '```http',
        requestExample,
        '```',
        '',
        examples ? this.generateKibanaApiDocumentation(apiInfo, examples) : '',
        examples ? '' : '',
        '---',
        `_<span style="text-shadow: 0 0 3px rgba(255,255,0,0.4); opacity: 0.7;">💡</span> Use Ctrl+Space for parameter autocomplete_`,
      ]
        .filter((line) => line !== null)
        .join('\n');

      return this.createMarkdownContent(content);
    } catch (error) {
      // console.warn('KibanaMonacoConnectorHandler: Error generating hover content', error);
      return null;
    }
  }

  /**
   * Get examples for Kibana connector types
   */
  getExamples(connectorType: string): ConnectorExamples | null {
    return this.connectorExamples.get(connectorType) || null;
  }

  /**
   * Process generated connectors to extract examples
   */
  private processGeneratedConnectors(
    generatedConnectors: Array<{
      type: string;
      description?: string;
      examples?: ConnectorExamples;
      methods?: string[];
      patterns?: string[];
    }>
  ): void {
    for (const connector of generatedConnectors) {
      if (connector.examples) {
        this.connectorExamples.set(connector.type, connector.examples);
      }
    }
    // console.log(
    //   `KibanaMonacoConnectorHandler: Processed ${this.connectorExamples.size} connector examples`
    // );
  }

  /**
   * Parse Kibana connector type to extract API information
   */
  private parseKibanaConnectorType(
    connectorType: string,
    connector?: InternalConnectorContract
  ): {
    method: string;
    path: string;
    operationId: string;
    description?: string;
  } | null {
    // Extract operation ID from connector type (kibana.operationId)
    const operationId = connectorType.replace('kibana.', '');

    // Use connector information if available
    const method = connector?.methods?.[0] || 'POST';
    const path =
      connector?.patterns?.[0] || `/api/${operationId.replace(/([A-Z])/g, '/$1').toLowerCase()}`;
    const description = connector?.description || `Kibana ${operationId} API endpoint`;

    return {
      method,
      path,
      operationId,
      description,
    };
  }

  /**
   * Generate API documentation section
   */
  private generateKibanaApiDocumentation(
    apiInfo: { method: string; path: string; operationId: string },
    examples: ConnectorExamples | null
  ): string {
    const lines = [
      '**API Information:**',
      `- **Method**: ${apiInfo.method}`,
      `- **Path**: ${apiInfo.path}`,
      `- **Operation**: ${apiInfo.operationId}`,
    ];

    if (examples?.params) {
      lines.push('', '**Example Parameters:**');
      lines.push('```yaml');
      for (const [key, value] of Object.entries(examples.params)) {
        lines.push(
          `${key}: ${typeof value === 'string' ? `"${value}"` : JSON.stringify(value, null, 2)}`
        );
      }
      lines.push('```');
    }

    if (examples?.snippet) {
      lines.push('', '**Example Usage:**');
      lines.push('```yaml');
      lines.push(examples.snippet);
      lines.push('```');
    }

    return lines.join('\n');
  }

  /**
   * Get connector information from schema
   */
  private getConnectorInfo(connectorType: string): InternalConnectorContract | null {
    try {
      const allConnectors = getAllConnectors();
      if (!allConnectors) {
        return null;
      }

      const connector = allConnectors.find((c) => c.type === connectorType);
      if (!connector || !isInternalConnector(connector)) {
        return null;
      }
      return connector;
    } catch (error) {
      // console.warn('KibanaMonacoConnectorHandler: Error getting connector info', error);
      return null;
    }
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

      // Fallback to generic Kibana API docs
      return 'https://www.elastic.co/guide/en/kibana/current/api.html';
    } catch (error) {
      // console.warn('KibanaMonacoConnectorHandler: Error getting documentation URL', error);
      return null;
    }
  }

  /**
   * Generate request example
   */
  private generateRequestExample(
    apiInfo: { method: string; path: string },
    withParams: Record<string, unknown>
  ): string {
    const lines = [
      `${apiInfo.method} ${decodeURIComponent(apiInfo.path)}`,
      'Content-Type: application/json',
      'kbn-xsrf: true',
    ];

    if (Object.keys(withParams).length > 0) {
      lines.push('');
      lines.push(JSON.stringify(withParams, null, 2));
    }

    return lines.join('\n');
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
      // console.warn('KibanaMonacoConnectorHandler: Error extracting with params', error);
    }

    return withParams;
  }
}
