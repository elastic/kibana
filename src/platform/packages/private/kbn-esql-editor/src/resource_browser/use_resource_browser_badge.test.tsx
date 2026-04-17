/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { monaco } from '@kbn/monaco';
import { useSourcesBadge } from './use_resource_browser_badge';
import { IndicesBrowserOpenMode } from './types';

jest.mock('@elastic/eui', () => ({
  useEuiTheme: () => ({
    euiTheme: {
      colors: { primary: '#07C', backgroundBasePrimary: '#FFF', backgroundLightPrimary: '#E0F0FF' },
      size: { xs: '4px', s: '8px', xl: '24px' },
      font: { scale: { s: '0.875rem' }, weight: { medium: '500' } },
      animation: { fast: '150ms' },
    },
  }),
}));

describe('useSourcesBadge', () => {
  const mockOpenIndicesBrowser = jest.fn();
  const suppressSuggestionsRef = { current: false };

  // 'FROM myindex': FROM occupies columns 1–4 (endColumn = 5), space at offset 4
  const QUERY = 'FROM myindex';
  const FROM_WORD = { word: 'FROM', startColumn: 1, endColumn: 5 };
  const INDEX_WORD = { word: 'myindex', startColumn: 6, endColumn: 13 };

  const mockEditor = {
    setPosition: jest.fn(),
    getDomNode: jest.fn(() => null),
    createDecorationsCollection: jest.fn(() => ({ clear: jest.fn() })),
  } as unknown as monaco.editor.IStandaloneCodeEditor;

  const mockModel = {
    getValue: jest.fn(() => QUERY),
    getWordAtPosition: jest.fn(() => FROM_WORD),
    // offset 4 → the space character in 'FROM myindex', satisfying the trailing-whitespace check
    getOffsetAt: jest.fn(() => 4),
  } as unknown as monaco.editor.ITextModel;

  const editorRef = { current: mockEditor };
  const editorModel = { current: mockModel };

  const renderBadge = () =>
    renderHook(() =>
      useSourcesBadge({
        editorRef,
        editorModel,
        openIndicesBrowser: mockOpenIndicesBrowser,
        suppressSuggestionsRef,
      })
    );

  const makeEvent = (
    type: monaco.editor.MouseTargetType,
    lineNumber: number,
    column: number
  ): monaco.editor.IEditorMouseEvent =>
    ({
      target: { type, position: { lineNumber, column } },
    } as unknown as monaco.editor.IEditorMouseEvent);

  beforeEach(() => {
    jest.clearAllMocks();
    (mockModel.getValue as jest.Mock).mockReturnValue(QUERY);
    (mockModel.getWordAtPosition as jest.Mock).mockReturnValue(FROM_WORD);
    (mockModel.getOffsetAt as jest.Mock).mockReturnValue(4);
  });

  describe('sourcesLabelClickHandler', () => {
    it('does not open the browser when target type is CONTENT_EMPTY when clicking above the first line', () => {
      // Monaco clamps e.target.position to {lineNumber: 1, column: 1} when the user clicks
      // above the first line, but reports type CONTENT_EMPTY - without the target type guard
      // this would incorrectly match the FROM keyword and open the browser.
      const { result } = renderBadge();

      result.current.sourcesLabelClickHandler(
        makeEvent(monaco.editor.MouseTargetType.CONTENT_EMPTY, 1, 1)
      );

      expect(mockOpenIndicesBrowser).not.toHaveBeenCalled();
    });

    it('does not open the browser when target type is CONTENT_EMPTY when clicking below the last line', () => {
      const { result } = renderBadge();

      result.current.sourcesLabelClickHandler(
        makeEvent(monaco.editor.MouseTargetType.CONTENT_EMPTY, 2, 1)
      );

      expect(mockOpenIndicesBrowser).not.toHaveBeenCalled();
    });

    it('does not open the browser for gutter clicks (GUTTER_LINE_NUMBERS)', () => {
      const { result } = renderBadge();

      result.current.sourcesLabelClickHandler(
        makeEvent(monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS, 1, 1)
      );

      expect(mockOpenIndicesBrowser).not.toHaveBeenCalled();
    });

    it('does not open the browser for UNKNOWN target type', () => {
      const { result } = renderBadge();

      result.current.sourcesLabelClickHandler(
        makeEvent(monaco.editor.MouseTargetType.UNKNOWN, 1, 1)
      );

      expect(mockOpenIndicesBrowser).not.toHaveBeenCalled();
    });

    it('opens the browser when clicking on the FROM keyword with CONTENT_TEXT type', () => {
      const { result } = renderBadge();

      result.current.sourcesLabelClickHandler(
        makeEvent(monaco.editor.MouseTargetType.CONTENT_TEXT, 1, 1)
      );

      expect(mockOpenIndicesBrowser).toHaveBeenCalledWith({
        openedFrom: IndicesBrowserOpenMode.Badge,
      });
    });

    it('does not open the browser when clicking on the index name (not a supported command)', () => {
      (mockModel.getWordAtPosition as jest.Mock).mockReturnValue(INDEX_WORD);

      const { result } = renderBadge();

      result.current.sourcesLabelClickHandler(
        makeEvent(monaco.editor.MouseTargetType.CONTENT_TEXT, 1, 6)
      );

      expect(mockOpenIndicesBrowser).not.toHaveBeenCalled();
    });

    it('does not open the browser when target position is null', () => {
      const { result } = renderBadge();

      result.current.sourcesLabelClickHandler({
        target: { type: monaco.editor.MouseTargetType.CONTENT_TEXT, position: null },
      } as unknown as monaco.editor.IEditorMouseEvent);

      expect(mockOpenIndicesBrowser).not.toHaveBeenCalled();
    });

    it('does not open the browser when FROM has no trailing whitespace', () => {
      // query is just 'FROM' with no space - getOffsetAt returns 4 which is beyond the
      // string, so queryText[4] is undefined, failing the whitespace guard
      (mockModel.getValue as jest.Mock).mockReturnValue('FROM');
      (mockModel.getOffsetAt as jest.Mock).mockReturnValue(4);

      const { result } = renderBadge();

      result.current.sourcesLabelClickHandler(
        makeEvent(monaco.editor.MouseTargetType.CONTENT_TEXT, 1, 1)
      );

      expect(mockOpenIndicesBrowser).not.toHaveBeenCalled();
    });
  });
});
