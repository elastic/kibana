/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getIndexSourcesFromQuery, suggest } from '@kbn/esql-language';
import { monaco } from '../../../../monaco_imports';
import { createMonacoProvider } from './providers_factory';
import { wrapAsMonacoSuggestions } from '../converters/suggestions';
import { filterSuggestionsWithCustomCommands, monacoPositionToOffset } from '../shared/utils';
import type { ESQLDependencies } from './types';

export const ESQL_AUTOCOMPLETE_TRIGGER_CHARS = ['(', ' ', '[', '?'];

const removeKeywordSuffix = (name: string) => {
  return name.endsWith('.keyword') ? name.slice(0, -8) : name;
};

export function getSuggestionProvider(
  deps?: ESQLDependencies
): monaco.languages.CompletionItemProvider {
  const itemContext = new WeakMap<
    monaco.languages.CompletionItem,
    {
      streamNames: string[];
      getFieldsMetadata: ESQLDependencies['getFieldsMetadata'];
    }
  >();

  return {
    triggerCharacters: ESQL_AUTOCOMPLETE_TRIGGER_CHARS,
    async provideCompletionItems(
      model: monaco.editor.ITextModel,
      position: monaco.Position
    ): Promise<monaco.languages.CompletionList> {
      return createMonacoProvider({
        model,
        run: async (safeModel) => {
          // Avoid returning suggestions for unfocused editors sharing the same model.
          const editors = monaco.editor
            .getEditors()
            .filter((editor) => editor.getModel() === model);
          const modelHasTextFocus =
            editors.length === 0 || editors.some((editor) => editor.hasTextFocus());

          if (!modelHasTextFocus) {
            return { suggestions: [] };
          }

          const resolvedCallbacks = deps?.getModelDependencies?.(model) ?? deps;
          const resolvedDeps = resolvedCallbacks
            ? ({ ...deps, ...resolvedCallbacks } as ESQLDependencies)
            : deps;
          const fullText = safeModel.getValue();
          const offset = monacoPositionToOffset(fullText, position);

          const computeStart = performance.now();
          const suggestions = await suggest(fullText, offset, resolvedDeps);

          const suggestionsWithCustomCommands = filterSuggestionsWithCustomCommands(suggestions);
          if (suggestionsWithCustomCommands.length) {
            resolvedDeps?.telemetry?.onSuggestionsWithCustomCommandShown?.(
              suggestionsWithCustomCommands
            );
          }

          const result = wrapAsMonacoSuggestions(suggestions, fullText);
          const computeEnd = performance.now();

          resolvedDeps?.telemetry?.onSuggestionsReady?.(
            computeStart,
            computeEnd,
            safeModel.getValueLength(),
            safeModel.getLineCount()
          );

          const streamNames = getIndexSourcesFromQuery(fullText).filter(
            (name) => !name.includes('*')
          );
          for (const suggestion of result.suggestions) {
            itemContext.set(suggestion, {
              streamNames,
              getFieldsMetadata: resolvedDeps?.getFieldsMetadata,
            });
          }

          return result;
        },
        emptyResult: { suggestions: [] },
      });
    },
    async resolveCompletionItem(item, token): Promise<monaco.languages.CompletionItem> {
      const context = itemContext.get(item);
      if (!context?.getFieldsMetadata) return item;

      const fieldsMetadataClient = await context.getFieldsMetadata;
      if (!fieldsMetadataClient) return item;

      // Fetch the full ECS field list upfront as a single lightweight check.
      // The client caches this result, so subsequent calls are free.
      const fullEcsMetadataList = await fieldsMetadataClient.find({ attributes: ['type'] });

      if (item.kind !== monaco.languages.CompletionItemKind.Variable) return item;
      if (typeof item.label !== 'string') return item;

      const strippedFieldName = removeKeywordSuffix(item.label);
      const { streamNames } = context;
      const documentationParts: string[] = [];

      // 1. ECS description
      if (fullEcsMetadataList && Object.hasOwn(fullEcsMetadataList.fields, strippedFieldName)) {
        const ecsMetadata = await fieldsMetadataClient.find({
          fieldNames: [strippedFieldName],
          attributes: ['description'],
        });
        const ecsDescription = ecsMetadata.fields[strippedFieldName]?.description;
        if (ecsDescription) {
          documentationParts.push(ecsDescription);
        }
      }

      // 2. Stream descriptions
      if (streamNames?.length) {
        const streamMetadata = await fieldsMetadataClient.find({
          fieldNames: [strippedFieldName],
          attributes: ['description'],
          streamNames,
          source: ['streams'],
        });
        const streamParts = streamNames.flatMap((streamName) => {
          const streamDescription =
            streamMetadata.streamFields[streamName]?.[strippedFieldName]?.description;
          return streamDescription ? [`Per **${streamName}** stream: ${streamDescription}`] : [];
        });
        if (streamParts.length > 0) {
          if (documentationParts.length > 0) {
            documentationParts.push('---');
          }
          documentationParts.push(streamParts.join('\n\n'));
        }
      }

      if (documentationParts.length === 0) {
        return item;
      }

      return {
        ...item,
        documentation: {
          value: documentationParts.join('\n\n'),
        },
      };
    },
  };
}
