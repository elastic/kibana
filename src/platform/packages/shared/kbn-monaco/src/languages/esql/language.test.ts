/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PartialFieldsMetadataClient } from '@kbn/esql-types';
import { getHoverItem, suggest } from '@kbn/esql-language';
import { monaco } from '../../monaco_imports';
import { ESQLLang, extractSourceFromQuery, type ESQLDependencies } from './language';

// Mock the getHoverItem and suggest functions
jest.mock('@kbn/esql-language', () => ({
  getHoverItem: jest.fn(),
  suggest: jest.fn(),
}));

describe('extractSourceFromQuery', () => {
  it('should extract source name from simple FROM clause', () => {
    expect(extractSourceFromQuery('FROM logs')).toBe('logs');
    expect(extractSourceFromQuery('FROM logs | WHERE true')).toBe('logs');
    expect(extractSourceFromQuery('from logs | LIMIT 10')).toBe('logs');
  });

  it('should extract dotted stream names', () => {
    expect(extractSourceFromQuery('FROM logs.nginx')).toBe('logs.nginx');
    expect(extractSourceFromQuery('FROM logs.nginx.access | STATS count()')).toBe(
      'logs.nginx.access'
    );
  });

  it('should return only the first source for multiple sources', () => {
    expect(extractSourceFromQuery('FROM logs, metrics | STATS count()')).toBe('logs');
  });

  it('should handle wildcard patterns', () => {
    expect(extractSourceFromQuery('FROM logs*')).toBe('logs*');
    expect(extractSourceFromQuery('FROM logs-*')).toBe('logs-*');
  });

  it('should handle underscores and hyphens in names', () => {
    expect(extractSourceFromQuery('FROM my_logs')).toBe('my_logs');
    expect(extractSourceFromQuery('FROM my-logs-2024')).toBe('my-logs-2024');
  });

  it('should return undefined for queries without FROM clause', () => {
    expect(extractSourceFromQuery('')).toBeUndefined();
    expect(extractSourceFromQuery('SHOW INFO')).toBeUndefined();
    expect(extractSourceFromQuery('ROW x = 1')).toBeUndefined();
  });

  it('should be case insensitive for FROM keyword', () => {
    expect(extractSourceFromQuery('FROM logs')).toBe('logs');
    expect(extractSourceFromQuery('from logs')).toBe('logs');
    expect(extractSourceFromQuery('From logs')).toBe('logs');
  });
});

describe('ESQLLang', () => {
  describe('getSuggestionProvider', () => {
    describe('resolveCompletionItem', () => {
      it('should resolve completion item with field metadata', async () => {
        const mockGetFieldsMetadata: Promise<PartialFieldsMetadataClient> = Promise.resolve({
          find: jest.fn().mockResolvedValue({
            fields: {
              'test.field': {
                type: 'keyword',
                description: 'Test field description',
              },
            },
          }),
        });

        const suggestionProvider = ESQLLang.getSuggestionProvider({
          getFieldsMetadata: mockGetFieldsMetadata,
        });

        const ecsItem: monaco.languages.CompletionItem = {
          label: 'test.field',
          kind: 4,
          insertText: 'test.field',
          range: new monaco.Range(0, 0, 0, 0),
        };

        const resolvedItem = await suggestionProvider.resolveCompletionItem!(ecsItem, {} as any);

        expect(resolvedItem).toEqual({
          ...ecsItem,
          documentation: {
            value: 'Test field description',
          },
        });

        const ecsItemWithKeywordSuffix: monaco.languages.CompletionItem = {
          label: 'test.field.keyword',
          kind: 4,
          insertText: 'test.field.keyword',
          range: new monaco.Range(0, 0, 0, 0),
        };

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
          }),
        });

        const suggestionProvider = ESQLLang.getSuggestionProvider({
          getFieldsMetadata: mockGetFieldsMetadata,
        });

        const item: monaco.languages.CompletionItem = {
          label: 'test.field',
          kind: 4,
          insertText: 'test.field',
          range: new monaco.Range(0, 0, 0, 0),
        };
        const resolvedItem = await suggestionProvider.resolveCompletionItem!(item, {} as any);

        expect(resolvedItem).toEqual(item);
      });

      it('should never call metadata find API if not needed', async () => {
        const mockFind = jest.fn().mockResolvedValue({
          fields: {},
        });
        const mockGetFieldsMetadata: Promise<PartialFieldsMetadataClient> = Promise.resolve({
          find: mockFind,
        });

        const suggestionProvider = ESQLLang.getSuggestionProvider({
          getFieldsMetadata: mockGetFieldsMetadata,
        });

        // For non-field items, we should not call find at all (early return)
        const notFieldItem: monaco.languages.CompletionItem = {
          label: 'CASE',
          kind: 1,
          insertText: 'CASE',
          range: new monaco.Range(0, 0, 0, 0),
        };

        const notFieldResolvedItem = await suggestionProvider.resolveCompletionItem!(
          notFieldItem,
          {} as any
        );
        expect(mockFind).toBeCalledTimes(0);
        expect(notFieldResolvedItem).toEqual(notFieldItem);

        mockFind.mockClear();
        // For field items that aren't in ECS/streams, we call find once to check ECS list
        const notECSFieldItem: monaco.languages.CompletionItem = {
          label: 'not.ecs.field',
          kind: 4,
          insertText: 'not.ecs.field',
          range: new monaco.Range(0, 0, 0, 0),
        };
        const notECSFieldResolvedItem = await suggestionProvider.resolveCompletionItem!(
          notECSFieldItem,
          {} as any
        );
        expect(mockFind).toBeCalledTimes(1);
        expect(notECSFieldResolvedItem).toEqual(notECSFieldItem);
      });

      it('should resolve field descriptions from stream when streamName is in FROM clause (stream only)', async () => {
        const mockFind = jest.fn().mockImplementation(async (params) => {
          // Return stream-specific description when streamName is provided
          if (params.streamName === 'logs.nginx') {
            return {
              fields: {
                message: {
                  type: 'keyword',
                  source: 'streams',
                  description: 'Stream-specific message description',
                },
              },
            };
          }
          // Return empty for ECS list check (field not in ECS)
          return { fields: {} };
        });

        const mockGetFieldsMetadata: Promise<PartialFieldsMetadataClient> = Promise.resolve({
          find: mockFind,
        });

        // Mock suggest to simulate provideCompletionItems being called first
        const mockSuggest = suggest as jest.MockedFunction<typeof suggest>;
        mockSuggest.mockResolvedValue([]);

        const suggestionProvider = ESQLLang.getSuggestionProvider({
          getFieldsMetadata: mockGetFieldsMetadata,
        });

        // First, simulate calling provideCompletionItems to set the lastQueryText
        const mockModel = {
          getValue: jest.fn().mockReturnValue('FROM logs.nginx | WHERE message = "test"'),
        } as unknown as monaco.editor.ITextModel;
        await suggestionProvider.provideCompletionItems(
          mockModel,
          new monaco.Position(1, 40),
          {} as monaco.languages.CompletionContext,
          {} as monaco.CancellationToken
        );

        // Now resolve a field completion item
        const fieldItem: monaco.languages.CompletionItem = {
          label: 'message',
          kind: 4,
          insertText: 'message',
          range: new monaco.Range(0, 0, 0, 0),
        };

        const resolvedItem = await suggestionProvider.resolveCompletionItem!(fieldItem, {} as any);

        // Should fetch from streams with the stream name
        expect(mockFind).toHaveBeenCalledWith(
          expect.objectContaining({
            fieldNames: ['message'],
            attributes: ['description'],
            streamName: 'logs.nginx',
          })
        );

        // Should have the stream-specific description (no ECS exists)
        expect(resolvedItem).toEqual({
          ...fieldItem,
          documentation: {
            value: 'Stream-specific message description',
          },
        });
      });

      it('should merge stream and ECS descriptions when both exist', async () => {
        const mockFind = jest.fn().mockImplementation(async (params) => {
          // Return stream-specific description when streamName is provided
          if (params.streamName === 'logs.nginx') {
            return {
              fields: {
                message: {
                  type: 'keyword',
                  source: 'streams',
                  description: 'Stream-specific message description',
                },
              },
            };
          }
          // ECS list check - return the field
          if (params.attributes?.includes('type') && !params.fieldNames) {
            return {
              fields: {
                message: { type: 'keyword', source: 'ecs' },
              },
            };
          }
          // ECS description lookup
          if (params.fieldNames?.includes('message') && !params.streamName) {
            return {
              fields: {
                message: {
                  type: 'keyword',
                  source: 'ecs',
                  description: 'ECS message description',
                },
              },
            };
          }
          return { fields: {} };
        });

        const mockGetFieldsMetadata: Promise<PartialFieldsMetadataClient> = Promise.resolve({
          find: mockFind,
        });

        const mockSuggest = suggest as jest.MockedFunction<typeof suggest>;
        mockSuggest.mockResolvedValue([]);

        const suggestionProvider = ESQLLang.getSuggestionProvider({
          getFieldsMetadata: mockGetFieldsMetadata,
        });

        const mockModel = {
          getValue: jest.fn().mockReturnValue('FROM logs.nginx | WHERE message = "test"'),
        } as unknown as monaco.editor.ITextModel;
        await suggestionProvider.provideCompletionItems(
          mockModel,
          new monaco.Position(1, 40),
          {} as monaco.languages.CompletionContext,
          {} as monaco.CancellationToken
        );

        const fieldItem: monaco.languages.CompletionItem = {
          label: 'message',
          kind: 4,
          insertText: 'message',
          range: new monaco.Range(0, 0, 0, 0),
        };

        const resolvedItem = await suggestionProvider.resolveCompletionItem!(fieldItem, {} as any);

        // Should have both descriptions merged
        expect(resolvedItem).toEqual({
          ...fieldItem,
          documentation: {
            value:
              '**Stream description:**\nStream-specific message description\n\n**ECS/OTel description:**\nECS message description',
          },
        });
      });

      it('should fall back to ECS when stream has no description for field', async () => {
        const mockFind = jest.fn().mockImplementation(async (params) => {
          // Stream has no description for this field
          if (params.streamName === 'logs') {
            return { fields: {} };
          }
          // ECS list check - return the field
          if (params.attributes?.includes('type') && !params.fieldNames) {
            return {
              fields: {
                '@timestamp': { type: 'date', source: 'ecs' },
              },
            };
          }
          // ECS description lookup
          if (params.fieldNames?.includes('@timestamp')) {
            return {
              fields: {
                '@timestamp': {
                  type: 'date',
                  source: 'ecs',
                  description: 'ECS timestamp description',
                },
              },
            };
          }
          return { fields: {} };
        });

        const mockGetFieldsMetadata: Promise<PartialFieldsMetadataClient> = Promise.resolve({
          find: mockFind,
        });

        const mockSuggest = suggest as jest.MockedFunction<typeof suggest>;
        mockSuggest.mockResolvedValue([]);

        const suggestionProvider = ESQLLang.getSuggestionProvider({
          getFieldsMetadata: mockGetFieldsMetadata,
        });

        // Set up the query context
        const mockModel = {
          getValue: jest.fn().mockReturnValue('FROM logs | WHERE @timestamp > now()'),
        } as unknown as monaco.editor.ITextModel;
        await suggestionProvider.provideCompletionItems(
          mockModel,
          new monaco.Position(1, 35),
          {} as monaco.languages.CompletionContext,
          {} as monaco.CancellationToken
        );

        const fieldItem: monaco.languages.CompletionItem = {
          label: '@timestamp',
          kind: 4,
          insertText: '@timestamp',
          range: new monaco.Range(0, 0, 0, 0),
        };

        const resolvedItem = await suggestionProvider.resolveCompletionItem!(fieldItem, {} as any);

        // Should have fallen back to ECS description
        expect(resolvedItem).toEqual({
          ...fieldItem,
          documentation: {
            value: 'ECS timestamp description',
          },
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
        const mockSuggest = suggest as jest.MockedFunction<typeof suggest>;
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
  });

  describe('getHoverProvider', () => {
    let mockModel: monaco.editor.ITextModel;
    let mockPosition: monaco.Position;
    let mockToken: monaco.CancellationToken;
    let mockGetHoverItem: jest.MockedFunction<typeof getHoverItem>;

    beforeEach(() => {
      mockModel = {
        getValue: jest.fn().mockReturnValue('FROM index | EVAL field = 1'),
        getWordAtPosition: jest.fn(),
        getDecorationsInRange: jest.fn().mockReturnValue([]),
      } as unknown as monaco.editor.ITextModel;

      mockPosition = new monaco.Position(1, 10);
      mockToken = {} as monaco.CancellationToken;
      mockGetHoverItem = getHoverItem as jest.MockedFunction<typeof getHoverItem>;
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('basic hover functionality', () => {
      it('should call getHoverItem correctly', async () => {
        const mockDeps: ESQLDependencies = {
          getFieldsMetadata: Promise.resolve({} as any),
          telemetry: {
            onDecorationHoverShown: jest.fn(),
          },
        };

        const mockHoverResult = {
          contents: [{ value: 'Test hover content' }],
        };
        mockGetHoverItem.mockResolvedValue(mockHoverResult);

        const hoverProvider = ESQLLang.getHoverProvider!(mockDeps);
        await hoverProvider.provideHover(mockModel, mockPosition, mockToken);

        expect(mockGetHoverItem).toHaveBeenCalledWith('FROM index | EVAL field = 1', 9, mockDeps);
      });
    });

    describe('telemetry tracking', () => {
      it('should track decoration hover when word changes and decorations have hover messages', async () => {
        const mockOnDecorationHoverShown = jest.fn();
        const mockDeps: ESQLDependencies = {
          telemetry: {
            onDecorationHoverShown: mockOnDecorationHoverShown,
          },
        };

        const mockWordAtPosition = {
          word: 'testword',
          startColumn: 5,
          endColumn: 13,
        };

        const mockDecorations = [
          {
            options: {
              hoverMessage: { value: 'Test hover message' },
            },
          },
        ];

        (mockModel.getWordAtPosition as jest.Mock).mockReturnValue(mockWordAtPosition);
        (mockModel.getDecorationsInRange as jest.Mock).mockReturnValue(mockDecorations);
        mockGetHoverItem.mockResolvedValue({
          contents: [],
        });

        const hoverProvider = ESQLLang.getHoverProvider!(mockDeps);
        await hoverProvider.provideHover(mockModel, mockPosition, mockToken);

        expect(mockOnDecorationHoverShown).toHaveBeenCalledWith('Test hover message');
      });

      it('should not track decoration hover when word has not changed', async () => {
        const mockOnDecorationHoverShown = jest.fn();
        const mockDeps: ESQLDependencies = {
          telemetry: {
            onDecorationHoverShown: mockOnDecorationHoverShown,
          },
        };

        const mockWordAtPosition = {
          word: 'testword',
          startColumn: 5,
          endColumn: 13,
        };

        const mockDecorations = [
          {
            options: {
              hoverMessage: { value: 'Test hover message' },
            },
          },
        ];

        (mockModel.getWordAtPosition as jest.Mock).mockReturnValue(mockWordAtPosition);
        (mockModel.getDecorationsInRange as jest.Mock).mockReturnValue(mockDecorations);
        mockGetHoverItem.mockResolvedValue({
          contents: [],
        });

        const hoverProvider = ESQLLang.getHoverProvider!(mockDeps);

        // First hover should trigger tracking
        await hoverProvider.provideHover(mockModel, mockPosition, mockToken);
        expect(mockOnDecorationHoverShown).toHaveBeenCalledTimes(1);

        // Second hover on same word should not trigger tracking
        await hoverProvider.provideHover(mockModel, mockPosition, mockToken);
        expect(mockOnDecorationHoverShown).toHaveBeenCalledTimes(1);
      });

      it('should track decoration hover when word changes to different word', async () => {
        const mockOnDecorationHoverShown = jest.fn();
        const mockDeps: ESQLDependencies = {
          telemetry: {
            onDecorationHoverShown: mockOnDecorationHoverShown,
          },
        };

        const mockWordAtPosition1 = {
          word: 'firstword',
          startColumn: 5,
          endColumn: 14,
        };

        const mockWordAtPosition2 = {
          word: 'secondword',
          startColumn: 15,
          endColumn: 25,
        };

        const mockDecorations = [
          {
            options: {
              hoverMessage: { value: 'Test hover message' },
            },
          },
        ];

        (mockModel.getDecorationsInRange as jest.Mock).mockReturnValue(mockDecorations);
        mockGetHoverItem.mockResolvedValue({
          contents: [],
        });

        const hoverProvider = ESQLLang.getHoverProvider!(mockDeps);

        // First hover
        (mockModel.getWordAtPosition as jest.Mock).mockReturnValue(mockWordAtPosition1);
        await hoverProvider.provideHover(mockModel, mockPosition, mockToken);
        expect(mockOnDecorationHoverShown).toHaveBeenCalledTimes(1);

        // Second hover on different word
        (mockModel.getWordAtPosition as jest.Mock).mockReturnValue(mockWordAtPosition2);
        await hoverProvider.provideHover(mockModel, mockPosition, mockToken);
        expect(mockOnDecorationHoverShown).toHaveBeenCalledTimes(2);
      });

      it('should not track decoration hover when no decorations exist', async () => {
        const mockOnDecorationHoverShown = jest.fn();
        const mockDeps: ESQLDependencies = {
          telemetry: {
            onDecorationHoverShown: mockOnDecorationHoverShown,
          },
        };

        const mockWordAtPosition = {
          word: 'testword',
          startColumn: 5,
          endColumn: 13,
        };

        (mockModel.getWordAtPosition as jest.Mock).mockReturnValue(mockWordAtPosition);
        (mockModel.getDecorationsInRange as jest.Mock).mockReturnValue([]);
        mockGetHoverItem.mockResolvedValue({
          contents: [],
        });

        const hoverProvider = ESQLLang.getHoverProvider!(mockDeps);
        await hoverProvider.provideHover(mockModel, mockPosition, mockToken);

        expect(mockOnDecorationHoverShown).not.toHaveBeenCalled();
      });

      it('should not track decoration hover when decorations have no hover messages', async () => {
        const mockOnDecorationHoverShown = jest.fn();
        const mockDeps: ESQLDependencies = {
          telemetry: {
            onDecorationHoverShown: mockOnDecorationHoverShown,
          },
        };

        const mockWordAtPosition = {
          word: 'testword',
          startColumn: 5,
          endColumn: 13,
        };

        const mockDecorations = [
          {
            options: {},
          },
        ];

        (mockModel.getWordAtPosition as jest.Mock).mockReturnValue(mockWordAtPosition);
        (mockModel.getDecorationsInRange as jest.Mock).mockReturnValue(mockDecorations);
        mockGetHoverItem.mockResolvedValue({
          contents: [],
        });

        const hoverProvider = ESQLLang.getHoverProvider!(mockDeps);
        await hoverProvider.provideHover(mockModel, mockPosition, mockToken);

        expect(mockOnDecorationHoverShown).not.toHaveBeenCalled();
      });
    });
  });
});
