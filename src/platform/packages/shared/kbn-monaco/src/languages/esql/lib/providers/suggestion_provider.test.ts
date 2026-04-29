/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PartialFieldsMetadataClient } from '@kbn/esql-types';
import { suggest, getIndexSourcesFromQuery } from '@kbn/esql-language';
import { monaco } from '../../../../monaco_imports';
import { ESQLLang, type ESQLDependencies } from '../../language';

jest.mock('@kbn/esql-language', () => ({
  getHoverItem: jest.fn(),
  suggest: jest.fn(),
  getIndexSourcesFromQuery: jest.fn(),
}));

describe('suggestion_provider', () => {
  describe('resolveCompletionItem', () => {
    const mockSuggest = suggest as jest.MockedFunction<typeof suggest>;
    const mockGetIndexSourcesFromQuery = getIndexSourcesFromQuery as jest.MockedFunction<
      typeof getIndexSourcesFromQuery
    >;

    beforeEach(() => {
      mockSuggest.mockResolvedValue([]);
      // Default: naive extraction of index names from FROM clause
      mockGetIndexSourcesFromQuery.mockImplementation((query: string) => {
        const fromMatch = query.match(/FROM\s+([^|]+)/i);
        if (!fromMatch) return [];
        return fromMatch[1]
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    const createModel = (query: string) =>
      ({
        getValue: jest.fn().mockReturnValue(query),
        isDisposed: () => false,
      } as unknown as monaco.editor.ITextModel);

    const makeFieldSuggestion = (label: string) => ({
      label,
      text: label,
      kind: 'Variable' as const,
      detail: 'field',
    });

    const getItemFromProvider = async (
      suggestionProvider: ReturnType<typeof ESQLLang.getSuggestionProvider>,
      model: monaco.editor.ITextModel,
      label: string
    ) => {
      const result = await suggestionProvider.provideCompletionItems(
        model,
        new monaco.Position(1, 1),
        {} as any,
        {} as any
      );
      return result?.suggestions.find((s) => s.label === label)!;
    };

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
      });

      mockSuggest.mockResolvedValue([makeFieldSuggestion('test.field')]);
      const model = createModel('FROM index | EVAL test.field');
      const ecsItem = await getItemFromProvider(suggestionProvider, model, 'test.field');
      const resolvedItem = await suggestionProvider.resolveCompletionItem!(ecsItem, {} as any);

      expect(resolvedItem).toEqual({
        ...ecsItem,
        documentation: {
          value: 'Test field description',
        },
      });

      mockSuggest.mockResolvedValue([makeFieldSuggestion('test.field.keyword')]);
      const ecsItemWithKeywordSuffix = await getItemFromProvider(
        suggestionProvider,
        model,
        'test.field.keyword'
      );
      const resolvedItemWithKeywordSuffix = await suggestionProvider.resolveCompletionItem!(
        ecsItemWithKeywordSuffix,
        {} as any
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
      });

      mockSuggest.mockResolvedValue([makeFieldSuggestion('test.field')]);
      const model = createModel('FROM index | WHERE test.field');
      const item = await getItemFromProvider(suggestionProvider, model, 'test.field');
      const resolvedItem = await suggestionProvider.resolveCompletionItem!(item, {} as any);

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
      });

      // Use a wildcard query so streamNames is empty — stream fetch won't fire
      const model = createModel('FROM logs-* | EVAL');

      // Keyword kind (not Variable) — ECS check still fires, then early return
      mockSuggest.mockResolvedValue([
        { label: 'CASE', text: 'CASE', kind: 'Keyword', detail: 'CASE' },
      ]);
      const notFieldItem = await getItemFromProvider(suggestionProvider, model, 'CASE');
      const notFieldResolvedItem = await suggestionProvider.resolveCompletionItem!(
        notFieldItem,
        {} as any
      );
      expect(mockFind).toBeCalledTimes(1);
      expect(notFieldResolvedItem).toEqual(notFieldItem);

      mockFind.mockClear();

      // Variable kind but field not in ECS
      mockSuggest.mockResolvedValue([makeFieldSuggestion('not.ecs.field')]);
      const notECSFieldItem = await getItemFromProvider(suggestionProvider, model, 'not.ecs.field');
      const notECSFieldResolvedItem = await suggestionProvider.resolveCompletionItem!(
        notECSFieldItem,
        {} as any
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
        });

        mockSuggest.mockResolvedValue([makeFieldSuggestion('body.text')]);
        const model = createModel('FROM logs-kibana.otel-default | WHERE body.text');
        const item = await getItemFromProvider(suggestionProvider, model, 'body.text');
        const resolvedItem = await suggestionProvider.resolveCompletionItem!(item, {} as any);

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
        });

        mockSuggest.mockResolvedValue([makeFieldSuggestion('body.text')]);
        const model = createModel('FROM logs-kibana.otel-default | WHERE body.text');
        const item = await getItemFromProvider(suggestionProvider, model, 'body.text');
        const resolvedItem = await suggestionProvider.resolveCompletionItem!(item, {} as any);

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
        });

        mockSuggest.mockResolvedValue([makeFieldSuggestion('my.field')]);
        const model = createModel('FROM stream-a, stream-b | WHERE my.field');
        const item = await getItemFromProvider(suggestionProvider, model, 'my.field');
        const resolvedItem = await suggestionProvider.resolveCompletionItem!(item, {} as any);

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
        });

        mockSuggest.mockResolvedValue([makeFieldSuggestion('body.text')]);
        // No FROM clause — streamNames will be empty, so no stream fetch
        const model = createModel('ROW 1 | EVAL body_text = "test"');
        const item = await getItemFromProvider(suggestionProvider, model, 'body.text');
        const resolvedItem = await suggestionProvider.resolveCompletionItem!(item, {} as any);

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
        });

        mockSuggest.mockResolvedValue([makeFieldSuggestion('body.text.keyword')]);
        const model = createModel('FROM logs-kibana.otel-default | WHERE body.text.keyword');
        const item = await getItemFromProvider(suggestionProvider, model, 'body.text.keyword');
        const resolvedItem = await suggestionProvider.resolveCompletionItem!(item, {} as any);

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
        });

        mockSuggest.mockResolvedValue([makeFieldSuggestion('body.text')]);
        const model = createModel('FROM logs-* | WHERE body.text');
        const item = await getItemFromProvider(suggestionProvider, model, 'body.text');
        await suggestionProvider.resolveCompletionItem!(item, {} as any);

        // Wildcard source excluded — only the ECS list check, no stream fetch
        expect(mockFind).toBeCalledTimes(1);
      });
    });

    it('should call onSuggestionsWithCustomCommandShown when suggestions contain custom commands', async () => {
      const mockOnSuggestionsWithCustomCommandShown = jest.fn();

      const mockDeps: ESQLDependencies = {
        telemetry: {
          onSuggestionsWithCustomCommandShown: mockOnSuggestionsWithCustomCommandShown,
        },
      };

      // Mock the suggest function to return suggestions with custom commands
      mockSuggest.mockResolvedValue([
        {
          label: 'EVAL',
          text: 'EVAL',
          kind: 'Keyword',
          detail: 'EVAL command',
          command: {
            title: 'Trigger suggest',
            id: 'editor.action.triggerSuggest',
          },
        },
        {
          label: 'Custom Command 1',
          text: 'custom1',
          kind: 'Method',
          detail: 'Custom command 1',
          command: {
            title: 'Custom Action 1',
            id: 'custom.command.1',
          },
        },
        {
          label: 'Custom Command 2',
          text: 'custom2',
          kind: 'Method',
          detail: 'Custom command 2',
          command: {
            title: 'Custom Action 2',
            id: 'custom.command.2',
          },
        },
        {
          label: 'No Command',
          text: 'nocommand',
          kind: 'Variable',
          detail: 'No command item',
        },
      ]);

      const suggestionProvider = ESQLLang.getSuggestionProvider(mockDeps);

      const mockModel = {
        getValue: jest.fn().mockReturnValue('FROM index | EVAL'),
        isDisposed: () => false,
      } as unknown as monaco.editor.ITextModel;

      const mockPosition = new monaco.Position(1, 18);
      const mockContext = {} as monaco.languages.CompletionContext;
      const mockToken = {} as monaco.CancellationToken;

      await suggestionProvider.provideCompletionItems(
        mockModel,
        mockPosition,
        mockContext,
        mockToken
      );

      // Should be called with the custom command IDs (excluding 'editor.action.triggerSuggest')
      expect(mockOnSuggestionsWithCustomCommandShown).toHaveBeenCalledWith([
        'custom.command.1',
        'custom.command.2',
      ]);
    });
  });

  describe('disposed model', () => {
    it('getCompletion returns an empty list when the model is disposed (after focus gating allows run to touch the model)', async () => {
      (suggest as jest.MockedFunction<typeof suggest>).mockClear();

      const disposedModel = {
        getValue: jest.fn(),
        isDisposed: () => true,
        getValueLength: jest.fn(),
        getLineCount: jest.fn(),
      } as unknown as monaco.editor.ITextModel;

      const getEditorsSpy = jest.spyOn(monaco.editor, 'getEditors').mockReturnValue([
        {
          getModel: () => disposedModel,
          hasTextFocus: () => true,
        },
      ] as any);

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
        expect(suggest).not.toHaveBeenCalled();
        expect(disposedModel.getValue).not.toHaveBeenCalled();
      } finally {
        getEditorsSpy.mockRestore();
      }
    });
  });
});
