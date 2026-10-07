/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '../../../../../monaco_imports';
import { ESQLLang, type ESQLDependencies } from '../../language';
import { createDisposedTextModel, createField, createTextModel } from './test_helpers';

describe('hover_provider', () => {
  let mockModel: monaco.editor.ITextModel;
  let mockPosition: monaco.Position;
  let mockToken: monaco.CancellationToken;

  beforeEach(() => {
    mockModel = createTextModel({ value: 'FROM index | EVAL field = 1' });

    mockPosition = new monaco.Position(1, 10);
    mockToken = new monaco.CancellationTokenSource().token;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('basic hover functionality', () => {
    it('should return hover content from the language service', async () => {
      const queryText = 'from a | eval round(numberField)';
      const mockDeps: ESQLDependencies = {
        getColumnsFor: jest.fn(async () => [createField('numberField', 'double')]),
        telemetry: {
          onDecorationHoverShown: jest.fn(),
        },
      };

      const hoverModel = createTextModel({ value: queryText });

      const hoverProvider = ESQLLang.getHoverProvider!(mockDeps);
      const result = await hoverProvider.provideHover(
        hoverModel,
        new monaco.Position(1, queryText.indexOf('round') + 1),
        mockToken
      );

      expect(result?.contents.map(({ value }) => value)).toEqual(
        expect.arrayContaining([expect.stringContaining('ROUND(')])
      );
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

      const hoverProvider = ESQLLang.getHoverProvider!(mockDeps);

      // First hover should trigger tracking
      await hoverProvider.provideHover(mockModel, mockPosition, mockToken);
      expect(mockOnDecorationHoverShown).toHaveBeenCalledTimes(1);

      // Second hover on same word should not trigger tracking
      await hoverProvider.provideHover(mockModel, mockPosition, mockToken);
      expect(mockOnDecorationHoverShown).toHaveBeenCalledTimes(1);
    });

    it('should track the same word separately for each model', async () => {
      // The provider is registered once per language and shared by every ES|QL editor, so
      // deduplication has to be per model — otherwise the first editor to hover a word
      // silently swallows the second editor's telemetry for it.
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

      const createModelHoveringTestWord = (uri: string) =>
        createTextModel({
          value: 'FROM index | EVAL field = 1',
          uri: monaco.Uri.parse(uri),
          getWordAtPosition: jest.fn().mockReturnValue(mockWordAtPosition),
          getDecorationsInRange: jest.fn().mockReturnValue(mockDecorations),
        });

      const hoverProvider = ESQLLang.getHoverProvider!(mockDeps);

      await hoverProvider.provideHover(
        createModelHoveringTestWord('inmemory://first'),
        mockPosition,
        mockToken
      );
      expect(mockOnDecorationHoverShown).toHaveBeenCalledTimes(1);

      // Same word, different model — must still be reported.
      await hoverProvider.provideHover(
        createModelHoveringTestWord('inmemory://second'),
        mockPosition,
        mockToken
      );
      expect(mockOnDecorationHoverShown).toHaveBeenCalledTimes(2);
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

      const hoverProvider = ESQLLang.getHoverProvider!(mockDeps);
      await hoverProvider.provideHover(mockModel, mockPosition, mockToken);

      expect(mockOnDecorationHoverShown).not.toHaveBeenCalled();
    });
  });

  describe('disposed model', () => {
    it('getHover returns null without accessing the model value when the model is disposed', async () => {
      const disposedModel = createDisposedTextModel();

      const hoverProvider = ESQLLang.getHoverProvider!();
      const result = await hoverProvider.provideHover(
        disposedModel,
        new monaco.Position(1, 1),
        new monaco.CancellationTokenSource().token
      );

      expect(result).toBeNull();
      expect(disposedModel.getValue).not.toHaveBeenCalled();
    });
  });

  describe('already-cancelled token', () => {
    it('does not access the model or invoke dependency callbacks when the token is already cancelled', async () => {
      const mockGetColumnsFor = jest.fn(async () => [createField('numberField', 'double')]);
      const mockOnDecorationHoverShown = jest.fn();
      const mockDeps: ESQLDependencies = {
        getColumnsFor: mockGetColumnsFor,
        telemetry: {
          onDecorationHoverShown: mockOnDecorationHoverShown,
        },
      };

      const cancelledTokenSource = new monaco.CancellationTokenSource();
      cancelledTokenSource.cancel();

      const hoverProvider = ESQLLang.getHoverProvider!(mockDeps);
      const result = await hoverProvider.provideHover(
        mockModel,
        mockPosition,
        cancelledTokenSource.token
      );

      expect(result).toBeNull();
      expect(mockModel.getValue).not.toHaveBeenCalled();
      expect(mockGetColumnsFor).not.toHaveBeenCalled();
      expect(mockOnDecorationHoverShown).not.toHaveBeenCalled();
    });
  });
});
