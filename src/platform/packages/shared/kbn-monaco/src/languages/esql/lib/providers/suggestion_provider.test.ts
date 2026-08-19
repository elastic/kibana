/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQLVariableType, type PartialFieldsMetadataClient } from '@kbn/esql-types';
import { monaco } from '../../../../monaco_imports';
import { ESQLLang, type ESQLDependencies } from '../../language';
import { createDisposedTextModel, createField, createTextModel } from './test_helpers';

const cancellationToken = new monaco.CancellationTokenSource().token;

export const getCompletionItemFromProvider = async (
  suggestionProvider: monaco.languages.CompletionItemProvider,
  model: monaco.editor.ITextModel,
  label: string,
  position = new monaco.Position(1, model.getValue().length + 1)
) => {
  const result = await suggestionProvider.provideCompletionItems(
    model,
    position,
    {} as monaco.languages.CompletionContext,
    cancellationToken
  );
  return result?.suggestions.find((suggestion) => suggestion.label === label);
};

describe('suggestion_provider', () => {
  describe('resolveCompletionItem', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should resolve completion item with field metadata', async () => {
      const mockGetFieldsMetadata: Promise<PartialFieldsMetadataClient> = Promise.resolve({
        find: jest.fn().mockResolvedValue({
          fields: {
            'test.field': {
              type: 'keyword',
              description: 'Test field description',
            },
          },
          streamFields: {},
        }),
      });

      const suggestionProvider = ESQLLang.getSuggestionProvider({
        getFieldsMetadata: mockGetFieldsMetadata,
        getColumnsFor: jest.fn(async () => [
          createField('test.field'),
          createField('test.field.keyword'),
        ]),
      });

      const model = createTextModel({ value: 'FROM index | WHERE ' });
      const ecsItem = await getCompletionItemFromProvider(suggestionProvider, model, 'test.field');
      const resolvedItem = await suggestionProvider.resolveCompletionItem!(
        ecsItem!,
        cancellationToken
      );

      expect(resolvedItem).toEqual({
        ...ecsItem,
        documentation: {
          value: 'Test field description',
        },
      });

      const ecsItemWithKeywordSuffix = await getCompletionItemFromProvider(
        suggestionProvider,
        model,
        'test.field.keyword'
      );
      const resolvedItemWithKeywordSuffix = await suggestionProvider.resolveCompletionItem!(
        ecsItemWithKeywordSuffix!,
        cancellationToken
      );

      expect(resolvedItemWithKeywordSuffix).toEqual({
        ...ecsItemWithKeywordSuffix,
        documentation: {
          value: 'Test field description',
        },
      });
    });

    it('should return original item if field metadata is not available', async () => {
      const mockGetFieldsMetadata: Promise<PartialFieldsMetadataClient> = Promise.resolve({
        find: jest.fn().mockResolvedValue({
          fields: {},
          streamFields: {},
        }),
      });

      const suggestionProvider = ESQLLang.getSuggestionProvider({
        getFieldsMetadata: mockGetFieldsMetadata,
        getColumnsFor: jest.fn(async () => [createField('test.field')]),
      });

      const model = createTextModel({ value: 'FROM index | WHERE EVAL test.field' });
      const item = await getCompletionItemFromProvider(suggestionProvider, model, 'test.field');
      const resolvedItem = await suggestionProvider.resolveCompletionItem!(
        item!,
        cancellationToken
      );

      expect(resolvedItem).toEqual(item);
    });

    it('should never call metadata find API if not needed', async () => {
      const mockFind = jest.fn().mockResolvedValue({
        fields: {},
        streamFields: {},
      });
      const mockGetFieldsMetadata: Promise<PartialFieldsMetadataClient> = Promise.resolve({
        find: mockFind,
      });

      const suggestionProvider = ESQLLang.getSuggestionProvider({
        getFieldsMetadata: mockGetFieldsMetadata,
        getColumnsFor: jest.fn(async () => [createField('not.ecs.field')]),
      });

      // Use a wildcard query so streamNames is empty and stream fetch will not fire.
      const model = createTextModel({ value: 'FROM logs-* | ' });

      // Keyword kind (not Variable): ECS check still fires, then early return.
      const notFieldItem = await getCompletionItemFromProvider(suggestionProvider, model, 'LIMIT');
      const notFieldResolvedItem = await suggestionProvider.resolveCompletionItem!(
        notFieldItem!,
        cancellationToken
      );
      expect(mockFind).toBeCalledTimes(1);
      expect(notFieldResolvedItem).toEqual(notFieldItem);

      // Variable kind but field not in ECS
      const fieldModel = createTextModel({ value: 'FROM logs-* | WHERE ' });
      const notECSFieldItem = await getCompletionItemFromProvider(
        suggestionProvider,
        fieldModel,
        'not.ecs.field'
      );

      mockFind.mockClear();

      const notECSFieldResolvedItem = await suggestionProvider.resolveCompletionItem!(
        notECSFieldItem!,
        cancellationToken
      );
      expect(mockFind).toBeCalledTimes(1);
      expect(notECSFieldResolvedItem).toEqual(notECSFieldItem);
    });

    describe('stream descriptions', () => {
      it('should show stream description for a field when the query sources a stream', async () => {
        const mockFind = jest.fn().mockImplementation(({ streamNames, source }) => {
          if (streamNames?.includes('logs-kibana.otel-default') && source?.includes('streams')) {
            return Promise.resolve({
              fields: {},
              streamFields: {
                'logs-kibana.otel-default': {
                  'body.text': { type: 'keyword', description: 'Kibana body.text description' },
                },
              },
            });
          }
          return Promise.resolve({ fields: {}, streamFields: {} });
        });

        const suggestionProvider = ESQLLang.getSuggestionProvider({
          getFieldsMetadata: Promise.resolve({ find: mockFind }),
          getColumnsFor: jest.fn(async () => [createField('body.text')]),
        });

        const model = createTextModel({ value: 'FROM logs-kibana.otel-default | WHERE ' });
        const item = await getCompletionItemFromProvider(suggestionProvider, model, 'body.text');
        const resolvedItem = await suggestionProvider.resolveCompletionItem!(
          item!,
          cancellationToken
        );

        expect(resolvedItem).toEqual({
          ...item,
          documentation: {
            value: 'Per **logs-kibana.otel-default** stream: Kibana body.text description',
          },
        });
      });

      it('should combine ECS description and stream description separated by a divider', async () => {
        const mockFind = jest.fn().mockImplementation(({ streamNames, source }) => {
          if (streamNames?.includes('logs-kibana.otel-default') && source?.includes('streams')) {
            return Promise.resolve({
              fields: {},
              streamFields: {
                'logs-kibana.otel-default': {
                  'body.text': { type: 'keyword', description: 'Stream description' },
                },
              },
            });
          }
          return Promise.resolve({
            fields: {
              'body.text': { type: 'keyword', description: 'ECS description' },
            },
            streamFields: {},
          });
        });

        const suggestionProvider = ESQLLang.getSuggestionProvider({
          getFieldsMetadata: Promise.resolve({ find: mockFind }),
          getColumnsFor: jest.fn(async () => [createField('body.text')]),
        });

        const model = createTextModel({ value: 'FROM logs-kibana.otel-default | WHERE ' });
        const item = await getCompletionItemFromProvider(suggestionProvider, model, 'body.text');
        const resolvedItem = await suggestionProvider.resolveCompletionItem!(
          item!,
          cancellationToken
        );

        expect(resolvedItem).toEqual({
          ...item,
          documentation: {
            value:
              'ECS description\n\n---\n\nPer **logs-kibana.otel-default** stream: Stream description',
          },
        });
      });

      it('should show descriptions for multiple streams separated by a blank line', async () => {
        const mockFind = jest.fn().mockImplementation(({ streamNames, source }) => {
          if (source?.includes('streams') && streamNames?.length) {
            const streamFields: Record<string, Record<string, unknown>> = {};
            if (streamNames.includes('stream-a')) {
              streamFields['stream-a'] = {
                'my.field': { type: 'keyword', description: 'Description from stream-a' },
              };
            }
            if (streamNames.includes('stream-b')) {
              streamFields['stream-b'] = {
                'my.field': { type: 'keyword', description: 'Description from stream-b' },
              };
            }
            return Promise.resolve({ fields: {}, streamFields });
          }
          return Promise.resolve({ fields: {}, streamFields: {} });
        });

        const suggestionProvider = ESQLLang.getSuggestionProvider({
          getFieldsMetadata: Promise.resolve({ find: mockFind }),
          getColumnsFor: jest.fn(async () => [createField('my.field')]),
        });

        const model = createTextModel({ value: 'FROM stream-a, stream-b | WHERE ' });
        const item = await getCompletionItemFromProvider(suggestionProvider, model, 'my.field');
        const resolvedItem = await suggestionProvider.resolveCompletionItem!(
          item!,
          cancellationToken
        );

        expect(resolvedItem).toEqual({
          ...item,
          documentation: {
            value:
              'Per **stream-a** stream: Description from stream-a\n\nPer **stream-b** stream: Description from stream-b',
          },
        });
      });

      it('should not fetch stream descriptions when no stream is in the FROM clause', async () => {
        const mockFind = jest.fn().mockResolvedValue({ fields: {}, streamFields: {} });

        const suggestionProvider = ESQLLang.getSuggestionProvider({
          getFieldsMetadata: Promise.resolve({ find: mockFind }),
          getColumnsFor: jest.fn(async () => [createField('body.text')]),
        });

        // No FROM clause: streamNames will be empty, so no stream fetch.
        const model = createTextModel({ value: 'ROW body = "test" | EVAL ' });
        const item = await getCompletionItemFromProvider(suggestionProvider, model, 'body');
        const resolvedItem = await suggestionProvider.resolveCompletionItem!(
          item!,
          cancellationToken
        );

        expect(resolvedItem).toEqual(item);
        // Only the upfront ECS list check, no stream fetch
        expect(mockFind).toBeCalledTimes(1);
      });

      it('should strip .keyword suffix when looking up stream description', async () => {
        const mockFind = jest.fn().mockImplementation(({ fieldNames, streamNames, source }) => {
          if (
            streamNames?.includes('logs-kibana.otel-default') &&
            source?.includes('streams') &&
            fieldNames?.includes('body.text')
          ) {
            return Promise.resolve({
              fields: {},
              streamFields: {
                'logs-kibana.otel-default': {
                  'body.text': { type: 'keyword', description: 'Kibana body.text description' },
                },
              },
            });
          }
          return Promise.resolve({ fields: {}, streamFields: {} });
        });

        const suggestionProvider = ESQLLang.getSuggestionProvider({
          getFieldsMetadata: Promise.resolve({ find: mockFind }),
          getColumnsFor: jest.fn(async () => [createField('body.text')]),
        });

        const model = createTextModel({ value: 'FROM logs-kibana.otel-default | WHERE ' });
        const item = await getCompletionItemFromProvider(suggestionProvider, model, 'body.text');
        item!.label = 'body.text.keyword';
        const resolvedItem = await suggestionProvider.resolveCompletionItem!(
          item!,
          cancellationToken
        );

        expect(resolvedItem).toEqual({
          ...item,
          documentation: {
            value: 'Per **logs-kibana.otel-default** stream: Kibana body.text description',
          },
        });
      });

      it('should not fetch stream descriptions for wildcard sources', async () => {
        const mockFind = jest.fn().mockResolvedValue({ fields: {}, streamFields: {} });

        const suggestionProvider = ESQLLang.getSuggestionProvider({
          getFieldsMetadata: Promise.resolve({ find: mockFind }),
          getColumnsFor: jest.fn(async () => [createField('body.text')]),
        });

        const model = createTextModel({ value: 'FROM wild-* | WHERE ' });
        const item = await getCompletionItemFromProvider(suggestionProvider, model, 'body.text');
        await suggestionProvider.resolveCompletionItem!(item!, cancellationToken);

        // Wildcard source excluded: no stream fetch.
        expect(mockFind).not.toHaveBeenCalledWith(expect.objectContaining({ source: ['streams'] }));
      });
    });

    it('should call onSuggestionsWithCustomCommandShown when suggestions contain custom commands', async () => {
      const mockOnSuggestionsWithCustomCommandShown = jest.fn();

      const mockDeps: ESQLDependencies = {
        canSuggestVariables: () => true,
        getVariables: () => [
          {
            key: 'value',
            value: 10,
            type: ESQLVariableType.VALUES,
          },
        ],
        getColumnsFor: jest.fn(async () => [createField('agent.name')]),
        telemetry: {
          onSuggestionsWithCustomCommandShown: mockOnSuggestionsWithCustomCommandShown,
        },
      };

      const suggestionProvider = ESQLLang.getSuggestionProvider(mockDeps);

      const mockModel = createTextModel({ value: 'FROM index | LIMIT ?' });

      const mockPosition = new monaco.Position(1, 'FROM index | LIMIT ?'.length + 1);
      const mockContext = {} as monaco.languages.CompletionContext;
      const mockToken = {} as monaco.CancellationToken;

      await suggestionProvider.provideCompletionItems(
        mockModel,
        mockPosition,
        mockContext,
        mockToken
      );

      expect(mockOnSuggestionsWithCustomCommandShown).toHaveBeenCalledWith([
        'esql.control.values.create',
      ]);
    });
  });

  describe('disposed model', () => {
    it('getCompletion returns an empty list when the model is disposed without calling the model value', async () => {
      const disposedModel = createDisposedTextModel();

      const getEditorsSpy = jest.spyOn(monaco.editor, 'getEditors').mockReturnValue([
        {
          getModel: () => disposedModel,
          hasTextFocus: () => true,
        },
      ] as monaco.editor.IStandaloneCodeEditor[]);

      try {
        const suggestionProvider = ESQLLang.getSuggestionProvider();

        const result = await suggestionProvider.provideCompletionItems(
          disposedModel,
          new monaco.Position(1, 1),
          {
            triggerKind: monaco.languages.CompletionTriggerKind.Invoke,
          } as monaco.languages.CompletionContext,
          new monaco.CancellationTokenSource().token
        );

        expect(result).toEqual({ suggestions: [] });
        expect(disposedModel.getValue).not.toHaveBeenCalled();
      } finally {
        getEditorsSpy.mockRestore();
      }
    });
  });
});
