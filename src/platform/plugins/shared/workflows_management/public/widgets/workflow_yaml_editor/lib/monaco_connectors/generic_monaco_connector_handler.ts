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
  ActionContext,
  ActionInfo,
  ConnectorExamples,
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
      const category = this.categorizeConnector(connectorType);

      // Create basic hover content
      const content = [
        `**Workflow Connector**: \`${connectorType}\``,
        '',
        this.createConnectorOverview(
          connectorType,
          `${category.name} connector for workflow automation`,
          [
            `**Type**: ${category.description}`,
            '**Usage**: Configure parameters in the `with` block to customize the connector behavior.',
            category.documentation ? `**Documentation**: ${category.documentation}` : '',
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
   * Generate basic actions for generic connectors
   */
  async generateActions(context: ActionContext): Promise<ActionInfo[]> {
    const actions: ActionInfo[] = [];

    // Add generic "Copy Step" action
    actions.push(
      this.createActionInfo('copy-step', 'Copy Step', () => this.copyStep(context), {
        icon: 'copy',
        tooltip: 'Copy this workflow step to clipboard',
        priority: 5,
      })
    );

    // Add "Validate Step" action
    actions.push(
      this.createActionInfo('validate-step', 'Validate Step', () => this.validateStep(context), {
        icon: 'check',
        tooltip: 'Validate step configuration',
        priority: 3,
      })
    );

    return actions;
  }

  /**
   * Get basic examples for generic connector types
   */
  getExamples(connectorType: string): ConnectorExamples | null {
    const category = this.categorizeConnector(connectorType);

    // Return category-specific examples
    if (category.examples) {
      return {
        params: category.examples.params,
        snippet: `- name: ${connectorType.replace(/[^a-zA-Z0-9]/g, '_')}_step
  type: ${connectorType}
  with:
${Object.entries(category.examples.params || {})
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
  private categorizeConnector(connectorType: string): {
    name: string;
    description: string;
    documentation?: string;
    examples?: ConnectorExamples;
  } {
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
            channel: '#general',
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
            to: 'user@example.com',
            subject: 'Workflow Notification',
            message: 'Your workflow has completed successfully.',
          },
        },
      };
    }

    // Wait/delay connectors
    if (connectorType.includes('wait') || connectorType.includes('delay')) {
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
    if (connectorType.includes('console') || connectorType.includes('log')) {
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

    // Default fallback
    return {
      name: 'Custom',
      description: 'Custom connector for specialized workflow tasks',
      documentation: 'Refer to connector-specific documentation for parameter details',
    };
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
    const category = this.categorizeConnector(connectorType);
    if (category.examples?.params) {
      lines.push('', '**Example Parameters:**');
      for (const [key, value] of Object.entries(category.examples.params)) {
        lines.push(
          `- \`${key}\`: ${typeof value === 'string' ? `"${value}"` : JSON.stringify(value)}`
        );
      }
    }

    return lines.join('\n');
  }

  /**
   * Copy step to clipboard
   */
  private async copyStep(context: ActionContext): Promise<void> {
    try {
      const { stepContext } = context;
      if (!stepContext?.stepNode) {
        return;
      }

      // Convert step node to YAML string
      const stepYaml = stepContext.stepNode.toString();
      await navigator.clipboard.writeText(stepYaml);

      // console.log('GenericMonacoConnectorHandler: Step copied to clipboard');
    } catch (error) {
      // console.error('GenericMonacoConnectorHandler: Error copying step', error);
    }
  }

  /**
   * Validate step configuration
   */
  private async validateStep(context: ActionContext): Promise<void> {
    try {
      const { stepContext } = context;
      if (!stepContext) {
        return;
      }

      // Basic validation - check for required fields
      const hasName = !!stepContext.stepName;
      const hasType = !!stepContext.stepType;

      const issues: string[] = [];
      if (!hasName) issues.push('Missing step name');
      if (!hasType) issues.push('Missing step type');

      /*
      if (issues.length === 0) {
        console.log('GenericMonacoConnectorHandler: Step validation passed');
      } else {
        console.warn('GenericMonacoConnectorHandler: Step validation issues:', issues);
      }
      */
    } catch (error) {
      // console.error('GenericMonacoConnectorHandler: Error validating step', error);
    }
  }
}
