/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getHoverItem } from '@kbn/esql-language';
import { monaco } from '../../../../monaco_imports';
import { ESQLLang, type ESQLDependencies } from '../../language';

jest.mock('@kbn/esql-language', () => ({
  getHoverItem: jest.fn(),
  suggest: jest.fn(),
  getIndexSourcesFromQuery: jest.fn(),
}));

describe('hover_provider', () => {
  let mockModel: monaco.editor.ITextModel;
  let mockPosition: monaco.Position;
  let mockToken: monaco.CancellationToken;
  let mockGetHoverItem: jest.MockedFunction<typeof getHoverItem>;

  beforeEach(() => {
    mockModel = {
      getValue: jest.fn().mockReturnValue('FROM index | EVAL field = 1'),
      getWordAtPosition: jest.fn(),
      getDecorationsInRange: jest.fn().mockReturnValue([]),
      isDisposed: () => false,
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

  describe('disposed model', () => {
    it('getHover returns null and does not call the language service when the model is disposed', async () => {
      (getHoverItem as jest.MockedFunction<typeof getHoverItem>).mockClear();

      const disposedModel = {
        getValue: jest.fn(),
        isDisposed: () => true,
      } as unknown as monaco.editor.ITextModel;

      const hoverProvider = ESQLLang.getHoverProvider!();
      const result = await hoverProvider.provideHover(
        disposedModel,
        new monaco.Position(1, 1),
        new monaco.CancellationTokenSource().token
      );

      expect(result).toBeNull();
      expect(getHoverItem).not.toHaveBeenCalled();
      expect(disposedModel.getValue).not.toHaveBeenCalled();
    });
  });
});
