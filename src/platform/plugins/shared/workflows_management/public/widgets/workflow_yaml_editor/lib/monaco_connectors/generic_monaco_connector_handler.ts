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
 * Generic Monaco connector handler for unknown/unsupported connector types
 * Provides basic hover information and examples for any connector type
 */
export class GenericMonacoConnectorHandler extends BaseMonacoConnectorHandler {
  constructor() {
    // Lowest priority - catches all connector types not handled by specific handlers
    super('GenericMonacoConnectorHandler', 1, ['']); // Empty prefix matches everything
  }

  /**
   * This handler accepts any connector type as a fallback
   */
  canHandle(): boolean {
    return true; // Always accepts as fallback
  }

  /**
   * Generate generic hover content for unknown connectors
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
            '**Usage**: Configure parameters in the `with` block to customize the connector behavior.',
            connectorInfo.documentation ? `**Documentation**: ${connectorInfo.documentation}` : '',
          ].filter(Boolean)
        ),
        '',
        this.generateGenericParameterHelp(connectorType),
        '',
        '_💡 Tip: Check the connector documentation for specific parameter details_',
      ].join('\n');

      return this.createMarkdownContent(content);
    } catch (error) {
      // console.warn('GenericMonacoConnectorHandler: Error generating hover content', error);
      return null;
    }
  }

  /**
   * Get basic examples for generic connector types
   */
  getExamples(connectorType: string): ConnectorExamples | null {
    const connectorInfo = this.getConnectorInfo(connectorType);
    if (!connectorInfo) {
      return null;
    }

    // Return category-specific examples
    if (connectorInfo.examples) {
      return {
        params: connectorInfo.examples.params,
        snippet: `- name: ${connectorType.replace(/[^a-zA-Z0-9]/g, '_')}_step
  type: ${connectorType}
  with:
${Object.entries(connectorInfo.examples.params || {})
  .map(
    ([key, value]) =>
      `    ${key}: ${typeof value === 'string' ? `"${value}"` : JSON.stringify(value)}`
  )
  .join('\n')}`,
      };
    }

    return null;
  }

  /**
   * Categorize connector types to provide better help
   */
  private getConnectorInfo(connectorType: string): ConnectorInfo | null {
    // HTTP-related connectors
    if (connectorType.includes('http') || connectorType.includes('webhook')) {
      return {
        name: 'HTTP',
        description: 'HTTP request connector for web API integration',
        documentation: 'Configure URL, method, headers, and body parameters',
        examples: {
          params: {
            url: 'https://api.example.com/endpoint',
            method: 'GET',
            headers: { Authorization: 'Bearer token' },
          },
        },
      };
    }

    // Slack connectors
    if (connectorType.includes('slack')) {
      return {
        name: 'Slack',
        description: 'Slack messaging connector for notifications',
        documentation: 'Configure message content and channel settings',
        examples: {
          params: {
            message: 'Hello from workflow!',
          },
        },
      };
    }

    // Email connectors
    if (connectorType.includes('email') || connectorType.includes('mail')) {
      return {
        name: 'Email',
        description: 'Email connector for sending notifications',
        documentation: 'Configure recipient, subject, and message content',
        examples: {
          params: {
            to: ['user@example.com', 'other@example.com'],
            subject: 'Workflow Notification',
            message: 'Your workflow has completed successfully.',
          },
        },
      };
    }

    // Wait/delay connectors
    if (connectorType.includes('wait')) {
      return {
        name: 'Wait',
        description: 'Timing connector for workflow delays',
        documentation: 'Configure duration for pausing workflow execution',
        examples: {
          params: {
            duration: '5s',
          },
        },
      };
    }

    // Console/logging connectors
    if (connectorType.includes('console')) {
      return {
        name: 'Console',
        description: 'Logging connector for debugging and monitoring',
        documentation: 'Configure message content for workflow logging',
        examples: {
          params: {
            message: 'Workflow step completed',
            level: 'info',
          },
        },
      };
    }

    // AI/ML connectors
    if (
      connectorType.includes('inference') ||
      connectorType.includes('ai') ||
      connectorType.includes('ml')
    ) {
      return {
        name: 'AI/ML',
        description: 'AI/ML connector for inference and analysis',
        documentation: 'Configure model parameters and input data',
        examples: {
          params: {
            model: 'gpt-3.5-turbo',
            prompt: 'Analyze this data...',
          },
        },
      };
    }

    return null;
  }

  /**
   * Generate generic parameter help
   */
  private generateGenericParameterHelp(connectorType: string): string {
    const lines = [
      '**Common Parameters:**',
      '- Configure parameters in the `with` block',
      '- Use template variables like `{{ inputs.value }}` for dynamic values',
      '- Reference previous step outputs with `{{ steps.step_name.output }}`',
    ];

    // Add connector-specific hints
    const connectorInfo = this.getConnectorInfo(connectorType);
    if (!connectorInfo) {
      return '';
    }
    if (connectorInfo.examples?.params) {
      lines.push('', '**Example Parameters:**');
      for (const [key, value] of Object.entries(connectorInfo.examples.params)) {
        lines.push(
          `- \`${key}\`: ${typeof value === 'string' ? `"${value}"` : JSON.stringify(value)}`
        );
      }
    }

    return lines.join('\n');
  }
}
