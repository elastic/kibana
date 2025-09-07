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
import type {
  HoverContext,
  ActionContext,
  ActionInfo,
  ConnectorExamples,
} from '../monaco_providers/provider_interfaces';

/**
 * Monaco connector handler for Kibana APIs
 * Provides Monaco editor extensions (hover, actions, etc.) for Kibana connector types
 */
export class KibanaMonacoConnectorHandler extends BaseMonacoConnectorHandler {
  private readonly http?: HttpSetup;
  private readonly notifications?: NotificationsSetup;
  private readonly kibanaHost?: string;
  private readonly connectorExamples: Map<string, ConnectorExamples>;

  constructor(
    options: {
      http?: HttpSetup;
      notifications?: NotificationsSetup;
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
    this.http = options.http;
    this.notifications = options.notifications;
    this.kibanaHost = options.kibanaHost;
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

      // Extract API information from connector type
      const apiInfo = this.parseKibanaConnectorType(connectorType);
      if (!apiInfo) {
        return null;
      }

      // Get examples for this connector
      const examples = this.getExamples(connectorType);

      // Create hover content
      const content = [
        `**Kibana API**: \`${apiInfo.method} ${apiInfo.path}\``,
        '',
        this.createConnectorOverview(
          connectorType,
          apiInfo.description || `Execute ${apiInfo.method} request to ${apiInfo.path}`,
          [
            '**Usage**: This connector allows you to execute Kibana internal API calls from workflows.',
            '**Authentication**: Uses the current user context and Kibana security.',
            '**Parameters**: Configure request parameters in the `with` block.',
          ]
        ),
        '',
        this.generateKibanaApiDocumentation(apiInfo, examples),
        '',
        '_💡 Tip: Use examples from the generated OpenAPI specification_',
      ].join('\n');

      return this.createMarkdownContent(content);
    } catch (error) {
      console.warn('KibanaMonacoConnectorHandler: Error generating hover content', error);
      return null;
    }
  }

  /**
   * Generate floating action buttons for Kibana connectors
   */
  async generateActions(context: ActionContext): Promise<ActionInfo[]> {
    const actions: ActionInfo[] = [];

    // Add "Copy as cURL" action if we have HTTP service
    if (this.http && this.notifications) {
      actions.push(
        this.createActionInfo('copy-as-curl', 'Copy as cURL', () => this.copyAsCurl(context), {
          icon: 'copy',
          tooltip: 'Copy this step as cURL command',
          priority: 10,
        })
      );

      actions.push(
        this.createActionInfo('copy-as-fetch', 'Copy as Fetch', () => this.copyAsFetch(context), {
          icon: 'copy',
          tooltip: 'Copy this step as JavaScript fetch()',
          priority: 8,
        })
      );

      actions.push(
        this.createActionInfo('open-in-browser', 'Open API Docs', () => this.openApiDocs(context), {
          icon: 'documentation',
          tooltip: 'Open API documentation',
          priority: 6,
        })
      );
    }

    return actions;
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
    console.log(
      `KibanaMonacoConnectorHandler: Processed ${this.connectorExamples.size} connector examples`
    );
  }

  /**
   * Parse Kibana connector type to extract API information
   */
  private parseKibanaConnectorType(connectorType: string): {
    method: string;
    path: string;
    operationId: string;
    description?: string;
  } | null {
    // Extract operation ID from connector type (kibana.operationId)
    const operationId = connectorType.replace('kibana.', '');

    // This could be enhanced by looking up the actual API definition
    // For now, provide basic information
    return {
      method: 'POST', // Default, could be enhanced with actual method lookup
      path: `/api/${operationId.replace(/([A-Z])/g, '/$1').toLowerCase()}`, // Basic path generation
      operationId,
      description: `Kibana ${operationId} API endpoint`,
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
      console.warn('KibanaMonacoConnectorHandler: Error extracting with params', error);
    }

    return withParams;
  }

  /**
   * Copy step as cURL command
   */
  private async copyAsCurl(context: ActionContext): Promise<void> {
    try {
      const { connectorType, stepContext } = context;
      if (!stepContext) return;

      const withParams = this.extractWithParams(stepContext.stepNode);
      const apiInfo = this.parseKibanaConnectorType(connectorType);
      if (!apiInfo) return;

      const kibanaUrl = this.kibanaHost || 'http://localhost:5601';
      const curlCommand = this.generateCurlCommand(kibanaUrl, apiInfo, withParams);

      await navigator.clipboard.writeText(curlCommand);

      if (this.notifications) {
        this.notifications.toasts.addSuccess({
          title: 'Copied to clipboard',
          text: 'cURL command copied successfully',
        });
      }
    } catch (error) {
      console.error('KibanaMonacoConnectorHandler: Error copying as cURL', error);
      if (this.notifications) {
        this.notifications.toasts.addError(error as Error, {
          title: 'Failed to copy',
        });
      }
    }
  }

  /**
   * Copy step as JavaScript fetch
   */
  private async copyAsFetch(context: ActionContext): Promise<void> {
    try {
      const { connectorType, stepContext } = context;
      if (!stepContext) return;

      const withParams = this.extractWithParams(stepContext.stepNode);
      const apiInfo = this.parseKibanaConnectorType(connectorType);
      if (!apiInfo) return;

      const fetchCode = this.generateFetchCode(apiInfo, withParams);

      await navigator.clipboard.writeText(fetchCode);

      if (this.notifications) {
        this.notifications.toasts.addSuccess({
          title: 'Copied to clipboard',
          text: 'JavaScript fetch code copied successfully',
        });
      }
    } catch (error) {
      console.error('KibanaMonacoConnectorHandler: Error copying as fetch', error);
    }
  }

  /**
   * Open API documentation
   */
  private async openApiDocs(context: ActionContext): Promise<void> {
    try {
      // This could open the Kibana API docs or OpenAPI explorer
      const docsUrl = `${this.kibanaHost || 'http://localhost:5601'}/app/dev_tools#/console`;
      window.open(docsUrl, '_blank');

      if (this.notifications) {
        this.notifications.toasts.addInfo({
          title: 'API Documentation',
          text: 'Opened Kibana Dev Tools Console',
        });
      }
    } catch (error) {
      console.error('KibanaMonacoConnectorHandler: Error opening API docs', error);
    }
  }

  /**
   * Generate cURL command
   */
  private generateCurlCommand(
    kibanaUrl: string,
    apiInfo: { method: string; path: string },
    withParams: Record<string, any>
  ): string {
    const lines = [
      `curl -X ${apiInfo.method} "${kibanaUrl}${apiInfo.path}" \\`,
      `  -H "Content-Type: application/json" \\`,
      `  -H "kbn-xsrf: true" \\`,
    ];

    // Add body if present
    if (Object.keys(withParams).length > 0) {
      lines.push(`  -d '${JSON.stringify(withParams, null, 2)}'`);
    }

    return lines.join('\n');
  }

  /**
   * Generate JavaScript fetch code
   */
  private generateFetchCode(
    apiInfo: { method: string; path: string },
    withParams: Record<string, any>
  ): string {
    const lines = [
      `fetch('${apiInfo.path}', {`,
      `  method: '${apiInfo.method}',`,
      `  headers: {`,
      `    'Content-Type': 'application/json',`,
      `    'kbn-xsrf': 'true',`,
      `  },`,
    ];

    if (Object.keys(withParams).length > 0) {
      lines.push(`  body: JSON.stringify(${JSON.stringify(withParams, null, 4)}),`);
    }

    lines.push(`})`);
    lines.push(`.then(response => response.json())`);
    lines.push(`.then(data => console.log(data))`);
    lines.push(`.catch(error => console.error('Error:', error));`);

    return lines.join('\n');
  }
}
