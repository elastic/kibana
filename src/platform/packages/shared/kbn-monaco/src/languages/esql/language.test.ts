/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PartialFieldsMetadataClient } from '@kbn/esql-validation-autocomplete/src/shared/types';
import { getHoverItem } from '@kbn/esql-validation-autocomplete';
import { monaco } from '../../monaco_imports';
import { ESQLLang, type ESQLDependencies } from './language';

// Mock the getHoverItem function
jest.mock('@kbn/esql-validation-autocomplete', () => ({
  ...jest.requireActual('@kbn/esql-validation-autocomplete'),
  getHoverItem: jest.fn(),
}));

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
        expect(mockFind).toBeCalledTimes(1);
        expect(notFieldResolvedItem).toEqual(notFieldItem);

        mockFind.mockClear();
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
