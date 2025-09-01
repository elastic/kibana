/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import type { HttpSetup, NotificationsSetup } from '@kbn/core/public';
import type YAML from 'yaml';
import { findElasticsearchStepAtPosition, getConsoleFormat } from './elasticsearch_step_utils';

export interface ElasticsearchStepHoverProviderOptions {
  http: HttpSetup;
  notifications: NotificationsSetup;
  esHost?: string;
  kibanaHost?: string;
  getYamlDocument: () => YAML.Document | null;
}

/**
 * Creates a Monaco hover provider for Elasticsearch steps in workflow YAML
 * This provides basic tooltip information when hovering
 */
export function createElasticsearchStepHoverProvider(
  options: ElasticsearchStepHoverProviderOptions
): monaco.languages.HoverProvider {
  const { getYamlDocument } = options;

  return {
    provideHover: async (
      model: monaco.editor.ITextModel,
      position: monaco.Position
    ): Promise<monaco.languages.Hover | null> => {
      try {
        const yamlDocument = getYamlDocument();
        if (!yamlDocument) {
          return null;
        }

        const elasticsearchStep = findElasticsearchStepAtPosition(model, position, yamlDocument);
        if (!elasticsearchStep) {
          return null;
        }

        // Get the range for just the type line to make hover more precise
        const typeRange = elasticsearchStep.typeNode.range;
        if (!typeRange) {
          return null;
        }

        const startPosition = model.getPositionAt(typeRange[0]);
        const endPosition = model.getPositionAt(typeRange[1]);

        const range = new monaco.Range(
          startPosition.lineNumber,
          startPosition.column,
          endPosition.lineNumber,
          endPosition.column
        );

        // Generate the Console format for display
        const consoleFormat = getConsoleFormat(elasticsearchStep);
        
        // Simple markdown hover content
        const hoverContent: monaco.IMarkdownString = {
          value: [
            `**Elasticsearch API**: \`${elasticsearchStep.method} ${elasticsearchStep.url}\``,
            '',
            '```http',
            consoleFormat,
            '```',
            '',
            '_Position cursor on this step and look for floating action buttons →_'
          ].join('\n'),
        };

        return {
          range,
          contents: [hoverContent],
        };
      } catch (error) {
        // Silently ignore errors to avoid disrupting the editor experience
        console.warn('Error in Elasticsearch step hover provider:', error);
        return null;
      }
    },
  };
}

/**
 * Registers the Elasticsearch step hover provider with Monaco
 */
export function registerElasticsearchStepHoverProvider(
  options: ElasticsearchStepHoverProviderOptions
): monaco.IDisposable {
  const hoverProvider = createElasticsearchStepHoverProvider(options);
  return monaco.languages.registerHoverProvider('yaml', hoverProvider);
}
