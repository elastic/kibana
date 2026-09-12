/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/code-editor';
import { BaseMonacoConnectorHandler } from './base_monaco_connector_handler';
import { getCachedAllConnectors } from '../connectors_cache';
import type { ConnectorExamples, HoverContext } from '../monaco_providers/provider_interfaces';

/**
 * Generic Monaco connector handler for unknown/unsupported connector types
 * Provides basic hover information for any connector type
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

      const connector = getCachedAllConnectors().find(({ type }) => type === connectorType);
      if (!connector) {
        return null;
      }

      const bodyLines = [
        this.createConnectorOverview(
          connectorType,
          connector.description ?? connector.summary ?? 'Workflow connector action',
          [
            connector.summary ? `**Action**: ${connector.summary}` : '',
            '**Usage**: Configure parameters in the `with` block to customize the connector behavior.',
            connector.documentation ? `**Documentation**: ${connector.documentation}` : '',
          ].filter(Boolean)
        ),
        '',
        this.generateGenericParameterHelp(),
        '',
        '_💡 Tip: Check the connector documentation for specific parameter details_',
      ];

      return this.createMarkdownContent(
        this.prependStabilityBadgeToContent(
          this.getConnectorStabilityFromCache(connectorType),
          bodyLines
        )
      );
    } catch (error) {
      // console.warn('GenericMonacoConnectorHandler: Error generating hover content', error);
      return null;
    }
  }

  /**
   * Generic connector actions do not have safe fallback examples
   */
  getExamples(_connectorType: string): ConnectorExamples | null {
    return null;
  }

  /**
   * Generate generic parameter help
   */
  private generateGenericParameterHelp(): string {
    return [
      '**Common Parameters:**',
      '- Configure parameters in the `with` block',
      '- Use template variables like `{{ inputs.value }}` for dynamic values',
      '- Reference previous step outputs with `{{ steps.step_name.output }}`',
    ].join('\n');
  }
}
