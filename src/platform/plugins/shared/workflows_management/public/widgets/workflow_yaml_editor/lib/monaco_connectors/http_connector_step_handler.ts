/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/monaco';
import { BaseMonacoConnectorHandler } from './base_monaco_connector_handler';
import type {
  ConnectorExamples,
  ConnectorInfo,
  HoverContext,
} from '../monaco_providers/provider_interfaces';

/**
 * Extended connector info with HTTP-specific examples
 */
interface HttpConnectorInfo extends ConnectorInfo {
  examples?: ConnectorExamples & {
    connectorIdParams?: Record<string, unknown>;
  };
}

/**
 * HTTP Monaco connector handler
 * Provides basic hover information and examples for HTTP connector types
 */
export class HttpMonacoConnectorStepHandler extends BaseMonacoConnectorHandler {
  constructor() {
    super('HttpMonacoConnectorStepHandler', 100, ['http']);
  }

  /**
   * Generate HTTP hover content
   */
  async generateHoverContent(context: HoverContext): Promise<monaco.IMarkdownString | null> {
    try {
      const { connectorType, stepContext } = context;

      if (!stepContext) {
        return null;
      }

      // Determine connector category
      const connectorInfo = this.getConnectorInfo(connectorType);
      if (!connectorInfo) {
        return null;
      }

      // Create basic hover content
      const content = [
        `**Workflow Connector**: \`${connectorType}\``,
        '',
        this.createConnectorOverview(
          connectorType,
          `${connectorInfo.name} connector for workflow automation`,
          [
            `**Type**: ${connectorInfo.description}`,
            connectorInfo.documentation ? `**Documentation**: ${connectorInfo.documentation}` : '',
          ].filter(Boolean)
        ),
        '',
        this.generateUsageModesHelp(),
        '',
        this.generateParameterHelp(connectorType),
        '',
        '_💡 Tip: Use configured connectors to securely manage authentication credentials_',
      ].join('\n');

      return this.createMarkdownContent(content);
    } catch (error) {
      // console.warn('HttpMonacoConnectorStepHandler: Error generating hover content', error);
      return null;
    }
  }

  /**
   * Get examples for HTTP connector types
   */
  getExamples(connectorType: string): ConnectorExamples | null {
    const connectorInfo = this.getConnectorInfo(connectorType);
    if (!connectorInfo) {
      return null;
    }

    // Return examples for both usage modes
    if (connectorInfo.examples) {
      const stepName = `${connectorType.replace(/[^a-zA-Z0-9]/g, '_')}_step`;

      const httpExamples = connectorInfo.examples as HttpConnectorInfo['examples'];

      // Example with connector-id (recommended)
      const connectorIdExample = `- name: ${stepName}
  type: ${connectorType}
  connector-id: 1234-abcd-5678
  with:
${Object.entries(httpExamples?.connectorIdParams || {})
  .map(
    ([key, value]) =>
      `    ${key}: ${typeof value === 'string' ? `"${value}"` : JSON.stringify(value)}`
  )
  .join('\n')}`;

      // Example with direct URL (legacy)
      const directUrlExample = `- name: ${stepName}_legacy
  type: ${connectorType}
  with:
${Object.entries(httpExamples?.params || {})
  .map(
    ([key, value]) =>
      `    ${key}: ${typeof value === 'string' ? `"${value}"` : JSON.stringify(value)}`
  )
  .join('\n')}`;

      return {
        params: httpExamples?.connectorIdParams || httpExamples?.params,
        snippet: `${connectorIdExample}\n\n# Legacy format (still supported):\n${directUrlExample}`,
      };
    }

    return null;
  }

  /**
   * Categorize connector types to provide better help
   */
  private getConnectorInfo(connectorType: string): HttpConnectorInfo | null {
    // HTTP-related connectors
    if (connectorType === 'http') {
      return {
        name: 'HTTP',
        description: 'HTTP request connector for web API integration',
        documentation: 'Supports both configured connectors (recommended) and direct URL requests',
        examples: {
          // Direct URL mode (legacy)
          params: {
            url: 'https://api.example.com/endpoint',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          },
          // Connector-id mode (recommended)
          connectorIdParams: {
            path: '/endpoint',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          },
        },
      };
    }

    return null;
  }

  /**
   * Generate usage modes help
   */
  private generateUsageModesHelp(): string {
    return [
      '**Usage Modes:**',
      '',
      '**1. Using Configured Connector (Recommended)**',
      'Use a configured connector to securely manage authentication credentials:',
      '```yaml',
      '- name: http_step',
      '  type: http',
      '  connector-id: 1234-abcd-5678',
      '  with:',
      '    path: /api/v1/entity # Base url already configured in the connector configuration',
      '    method: POST',
      '    headers:',
      '      Content-Type: application/json',
      '```',
      '',
      '**2. Direct URL (Legacy)**',
      'Define the full URL directly (credentials must be included in headers):',
      '```yaml',
      '- name: http_step',
      '  type: http',
      '  with:',
      '    url: https://api.example.com/api/v1/entity',
      '    method: POST',
      '    headers:',
      '      Authorization: Bearer token',
      '```',
    ].join('\n');
  }

  /**
   * Generate parameter help
   */
  private generateParameterHelp(connectorType: string): string {
    const lines = [
      '**Parameters:**',
      '',
      '**When using `connector-id`:**',
      "- `path` (string, required): API endpoint path appended to the connector's base URL",
      '- `method` (string, required): HTTP method (GET, POST, PUT, DELETE, etc.)',
      '- `headers` (object, optional): Additional HTTP headers',
      '- `body` (string/object, optional): Request body for POST/PUT requests',
      '',
      '**When using direct URL (legacy):**',
      '- `url` (string, required): Full URL including protocol and domain',
      '- `method` (string, required): HTTP method (GET, POST, PUT, DELETE, etc.)',
      '- `headers` (object, optional): HTTP headers including authentication',
      '- `body` (string/object, optional): Request body for POST/PUT requests',
      '',
      '**Common:**',
      '- Use template variables like `{{ inputs.value }}` for dynamic values',
      '- Reference previous step outputs with `{{ steps.step_name.output }}`',
    ];

    // Add connector-specific example parameters
    const connectorInfo = this.getConnectorInfo(connectorType);
    if (connectorInfo?.examples) {
      const httpExamples = connectorInfo.examples as HttpConnectorInfo['examples'];
      if (httpExamples?.connectorIdParams) {
        lines.push('', '**Example with connector-id:**');
        for (const [key, value] of Object.entries(httpExamples.connectorIdParams)) {
          lines.push(
            `- \`${key}\`: ${typeof value === 'string' ? `"${value}"` : JSON.stringify(value)}`
          );
        }
      }
      if (httpExamples?.params) {
        lines.push('', '**Example with direct URL:**');
        for (const [key, value] of Object.entries(httpExamples.params)) {
          lines.push(
            `- \`${key}\`: ${typeof value === 'string' ? `"${value}"` : JSON.stringify(value)}`
          );
        }
      }
    }

    return lines.join('\n');
  }
}
