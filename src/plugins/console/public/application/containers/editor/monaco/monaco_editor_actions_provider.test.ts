/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/*
 * Mock kbn/monaco to provide the console parser code directly without a web worker
 */
const mockGetParsedRequests = jest.fn();

/*
 * Mock the function "populateContext" that accesses the autocomplete definitions
 */
const mockPopulateContext = jest.fn();

jest.mock('@kbn/monaco', () => {
  const original = jest.requireActual('@kbn/monaco');
  return {
    ...original,
    getParsedRequestsProvider: () => {
      return {
        getRequests: mockGetParsedRequests,
      };
    },
  };
});

jest.mock('../../../../services', () => {
  return {
    getStorage: () => ({
      get: () => [],
    }),
    StorageKeys: {
      VARIABLES: 'test',
    },
  };
});

jest.mock('../../../../lib/autocomplete/engine', () => {
  return {
    populateContext: (...args: any) => {
      mockPopulateContext(args);
    },
  };
});

import { MonacoEditorActionsProvider } from './monaco_editor_actions_provider';
import { monaco } from '@kbn/monaco';

describe('Editor actions provider', () => {
  let editorActionsProvider: MonacoEditorActionsProvider;
  let editor: jest.Mocked<monaco.editor.IStandaloneCodeEditor>;
  beforeEach(() => {
    editor = {
      getModel: jest.fn(),
      createDecorationsCollection: () => ({
        clear: jest.fn(),
        set: jest.fn(),
      }),
      focus: jest.fn(),
      onDidChangeCursorPosition: jest.fn(),
      onDidScrollChange: jest.fn(),
      onDidChangeCursorSelection: jest.fn(),
      onDidContentSizeChange: jest.fn(),
      getSelection: jest.fn(),
      getPosition: jest.fn(),
      getTopForLineNumber: jest.fn(),
      getScrollTop: jest.fn(),
      executeEdits: jest.fn(),
      setPosition: jest.fn(),
    } as unknown as jest.Mocked<monaco.editor.IStandaloneCodeEditor>;

    editor.getModel.mockReturnValue({
      getLineMaxColumn: () => 10,
      getPositionAt: () => ({ lineNumber: 1 }),
      getLineContent: () => 'GET _search',
    } as unknown as monaco.editor.ITextModel);
    editor.getSelection.mockReturnValue({
      startLineNumber: 1,
      endLineNumber: 1,
    } as unknown as monaco.Selection);
    mockGetParsedRequests.mockResolvedValue([
      {
        startOffset: 0,
        endOffset: 11,
        method: 'GET',
        url: '_search',
      },
    ]);

    const setEditorActionsCssMock = jest.fn();

    editorActionsProvider = new MonacoEditorActionsProvider(editor, setEditorActionsCssMock);
  });

  describe('getCurl', () => {
    it('returns an empty string if no requests', async () => {
      mockGetParsedRequests.mockResolvedValue([]);
      const curl = await editorActionsProvider.getCurl('http://localhost');
      expect(curl).toBe('');
    });

    it('returns an empty string if there is a request but not in the selection range', async () => {
      editor.getSelection.mockReturnValue({
        // the request is on line 1, the user selected line 2
        startLineNumber: 2,
        endLineNumber: 2,
      } as unknown as monaco.Selection);
      const curl = await editorActionsProvider.getCurl('http://localhost');
      expect(curl).toBe('');
    });

    it('returns the correct string if there is a request in the selection range', async () => {
      const curl = await editorActionsProvider.getCurl('http://localhost');
      expect(curl).toBe('curl -XGET "http://localhost/_search" -H "kbn-xsrf: reporting"');
    });
  });

  describe('getDocumentationLink', () => {
    const docLinkVersion = '8.13';
    const docsLink = 'http://elastic.co/_search';
    // mock the populateContext function that finds the correct autocomplete endpoint object and puts it into the context object
    mockPopulateContext.mockImplementation((...args) => {
      const context = args[0][1];
      context.endpoint = {
        documentation: docsLink,
      };
    });
    it('returns null if no requests', async () => {
      mockGetParsedRequests.mockResolvedValue([]);
      const link = await editorActionsProvider.getDocumentationLink(docLinkVersion);
      expect(link).toBe(null);
    });

    it('returns null if there is a request but not in the selection range', async () => {
      editor.getSelection.mockReturnValue({
        // the request is on line 1, the user selected line 2
        startLineNumber: 2,
        endLineNumber: 2,
      } as unknown as monaco.Selection);
      const link = await editorActionsProvider.getDocumentationLink(docLinkVersion);
      expect(link).toBe(null);
    });

    it('returns the correct link if there is a request in the selection range', async () => {
      const link = await editorActionsProvider.getDocumentationLink(docLinkVersion);
      expect(link).toBe(docsLink);
    });
  });

  describe('provideCompletionItems', () => {
    const mockModel = {
      getWordUntilPosition: () => {
        return {
          startColumn: 1,
        };
      },
      getPositionAt: () => {
        return {
          lineNumber: 1,
        };
      },
      getLineCount: () => 1,
      getLineContent: () => 'GET ',
      getValueInRange: () => 'GET ',
    } as unknown as jest.Mocked<monaco.editor.ITextModel>;
    const mockPosition = { lineNumber: 1, column: 1 } as jest.Mocked<monaco.Position>;
    const mockContext = {} as jest.Mocked<monaco.languages.CompletionContext>;
    const token = {} as jest.Mocked<monaco.CancellationToken>;
    it('returns completion items for method if no requests', async () => {
      mockGetParsedRequests.mockResolvedValue([]);
      const completionItems = await editorActionsProvider.provideCompletionItems(
        mockModel,
        mockPosition,
        mockContext,
        token
      );
      expect(completionItems?.suggestions.length).toBe(6);
      const methods = completionItems?.suggestions.map((suggestion) => suggestion.label);
      expect((methods as string[]).sort()).toEqual([
        'DELETE',
        'GET',
        'HEAD',
        'PATCH',
        'POST',
        'PUT',
      ]);
    });

    it('returns completion items for url path if method already typed in', async () => {
      // mock a parsed request that only has a method
      mockGetParsedRequests.mockResolvedValue([
        {
          startOffset: 0,
          method: 'GET',
        },
      ]);
      mockPopulateContext.mockImplementation((...args) => {
        const context = args[0][1];
        context.autoCompleteSet = [{ name: '_search' }, { name: '_cat' }];
      });
      const completionItems = await editorActionsProvider.provideCompletionItems(
        mockModel,
        mockPosition,
        mockContext,
        token
      );
      expect(completionItems?.suggestions.length).toBe(2);
      const endpoints = completionItems?.suggestions.map((suggestion) => suggestion.label);
      expect((endpoints as string[]).sort()).toEqual(['_cat', '_search']);
    });
  });

  describe('move to next/previous request edge', () => {
    beforeEach(() => {
      /* The editor has the following text:
      1:
      2: POST _search
      3: {
      4:   "test": "test"
      5: }
      6: GET _analyze
      7:
      */
      mockGetParsedRequests.mockReturnValue([
        {
          method: 'POST',
          url: '_search',
          startOffset: 1,
          endOffset: 36,
          data: [
            {
              test: 'test',
            },
          ],
        },
        {
          method: 'GET',
          url: '_analyze',
          startOffset: 37,
          endOffset: 49,
        },
      ]);

      editor.getModel.mockReturnValue({
        getPositionAt: (offset: number) => {
          // mock for start offsets of the mocked requests
          if (offset === 1) {
            return { lineNumber: 2, column: 1 };
          }
          if (offset === 37) {
            return { lineNumber: 6, column: 1 };
          }
          // mock for end offsets of the mocked requests
          if (offset === 36) {
            return { lineNumber: 5, column: 2 };
          }
          if (offset === 49) {
            return { lineNumber: 6, column: 13 };
          }
        },
        getLineContent: (lineNumber: number) => {
          if (lineNumber === 1) {
            return '';
          }
          if (lineNumber === 2) {
            return 'POST _search';
          }
          if (lineNumber === 3) {
            return '{';
          }
          if (lineNumber === 4) {
            return '  "test": "test"';
          }
          if (lineNumber === 5) {
            return '}';
          }
          if (lineNumber === 6) {
            return 'GET _analyze';
          }
          if (lineNumber === 7) {
            return '';
          }
        },
        getLineCount: () => 7,
      } as unknown as monaco.editor.ITextModel);
    });
    describe('moveToPreviousRequestEdge', () => {
      it('correctly sets position when cursor is at first line of a request', async () => {
        editor.getPosition.mockReturnValue({
          lineNumber: 6,
          column: 4,
        } as monaco.Position);

        await editorActionsProvider.moveToPreviousRequestEdge();
        expect(editor.setPosition).toHaveBeenCalledTimes(1);
        expect(editor.setPosition).toHaveBeenCalledWith({ lineNumber: 5, column: 1 });
      });

      it('correctly sets position when cursor is at last line of a request', async () => {
        editor.getPosition.mockReturnValue({
          lineNumber: 5,
          column: 1,
        } as monaco.Position);

        await editorActionsProvider.moveToPreviousRequestEdge();
        expect(editor.setPosition).toHaveBeenCalledTimes(1);
        expect(editor.setPosition).toHaveBeenCalledWith({ lineNumber: 2, column: 1 });
      });

      it('correctly sets position when cursor is inside a request', async () => {
        editor.getPosition.mockReturnValue({
          lineNumber: 4,
          column: 1,
        } as monaco.Position);

        await editorActionsProvider.moveToPreviousRequestEdge();
        expect(editor.setPosition).toHaveBeenCalledTimes(1);
        expect(editor.setPosition).toHaveBeenCalledWith({ lineNumber: 2, column: 1 });
      });

      it('correctly sets position when cursor is after a request', async () => {
        editor.getPosition.mockReturnValue({
          lineNumber: 7,
          column: 1,
        } as monaco.Position);

        await editorActionsProvider.moveToPreviousRequestEdge();
        expect(editor.setPosition).toHaveBeenCalledTimes(1);
        expect(editor.setPosition).toHaveBeenCalledWith({ lineNumber: 6, column: 1 });
      });

      it('correctly sets position to first line of editor when there are no requests before cursor', async () => {
        editor.getPosition.mockReturnValue({
          lineNumber: 2,
          column: 3,
        } as monaco.Position);

        await editorActionsProvider.moveToPreviousRequestEdge();
        expect(editor.setPosition).toHaveBeenCalledTimes(1);
        expect(editor.setPosition).toHaveBeenCalledWith({ lineNumber: 1, column: 1 });
      });
    });

    describe('moveToNextRequestEdge', () => {
      it('correctly sets position when cursor is at first line of a request', async () => {
        editor.getPosition.mockReturnValue({
          lineNumber: 2,
          column: 8,
        } as monaco.Position);

        await editorActionsProvider.moveToNextRequestEdge();
        expect(editor.setPosition).toHaveBeenCalledTimes(1);
        expect(editor.setPosition).toHaveBeenCalledWith({ lineNumber: 5, column: 1 });
      });

      it('correctly sets position when cursor is at last line of a request', async () => {
        editor.getPosition.mockReturnValue({
          lineNumber: 5,
          column: 1,
        } as monaco.Position);

        await editorActionsProvider.moveToNextRequestEdge();
        expect(editor.setPosition).toHaveBeenCalledTimes(1);
        expect(editor.setPosition).toHaveBeenCalledWith({ lineNumber: 6, column: 1 });
      });

      it('correctly sets position when cursor is inside a request', async () => {
        editor.getPosition.mockReturnValue({
          lineNumber: 3,
          column: 1,
        } as monaco.Position);

        await editorActionsProvider.moveToNextRequestEdge();
        expect(editor.setPosition).toHaveBeenCalledTimes(1);
        expect(editor.setPosition).toHaveBeenCalledWith({ lineNumber: 5, column: 1 });
      });

      it('correctly sets position when cursor is before a request', async () => {
        editor.getPosition.mockReturnValue({
          lineNumber: 1,
          column: 1,
        } as monaco.Position);

        await editorActionsProvider.moveToNextRequestEdge();
        expect(editor.setPosition).toHaveBeenCalledTimes(1);
        expect(editor.setPosition).toHaveBeenCalledWith({ lineNumber: 2, column: 1 });
      });

      it('correctly sets position to last line of editor when there are no requests after cursor', async () => {
        editor.getPosition.mockReturnValue({
          lineNumber: 6,
          column: 3,
        } as monaco.Position);

        await editorActionsProvider.moveToNextRequestEdge();
        expect(editor.setPosition).toHaveBeenCalledTimes(1);
        expect(editor.setPosition).toHaveBeenCalledWith({ lineNumber: 7, column: 1 });
      });
    });
  });

  describe('restoreRequestFromHistory', () => {
    const testHistoryRequest = 'GET _alias';
    beforeEach(() => {
      /*
       * The editor has the text
       * "POST _search" on line 1
       * { "test": "test" } on lines 2-4
       *  and "GET _analyze" on line 5
       */
      mockGetParsedRequests.mockReturnValue([
        {
          startOffset: 0,
          method: 'POST',
          url: '_search',
          endOffset: 35,
          data: [
            {
              test: 'test',
            },
          ],
        },
        {
          startOffset: 36,
          method: 'GET',
          url: '_analyze',
          endOffset: 48,
        },
      ]);

      editor.getModel.mockReturnValue({
        getLineMaxColumn: (lineNumber: number) => {
          // mock this function for line 4
          return 2;
        },
        getPositionAt: (offset: number) => {
          // mock this function for start offsets of the mocked requests
          if (offset === 0) {
            return { lineNumber: 1, column: 1 };
          }
          if (offset === 36) {
            return { lineNumber: 5, column: 1 };
          }
          // mock this function for end offsets of the mocked requests
          if (offset === 35) {
            return { lineNumber: 4, column: 2 };
          }
          if (offset === 48) {
            return { lineNumber: 5, column: 13 };
          }
        },
        getLineContent: (lineNumber: number) => {
          // mock this functions for line 1 and line 2
          if (lineNumber === 1) {
            return 'POST _search';
          }
          if (lineNumber === 2) {
            return '{';
          }
          if (lineNumber === 3) {
            return '  "test": "test"';
          }
          if (lineNumber === 4) {
            return '}';
          }
          if (lineNumber === 5) {
            return 'GET _analyze';
          }
        },
      } as unknown as monaco.editor.ITextModel);
    });

    it('insert the request at the beginning of the selected request', async () => {
      // the position of the cursor is in the middle of line 5
      editor.getPosition.mockReturnValue({
        lineNumber: 5,
        column: 4,
      } as monaco.Position);
      editor.getSelection.mockReturnValue({
        startLineNumber: 5,
        endLineNumber: 5,
      } as monaco.Selection);

      await editorActionsProvider.restoreRequestFromHistory(testHistoryRequest);
      const expectedRange = {
        startLineNumber: 5,
        startColumn: 1,
        endLineNumber: 5,
        endColumn: 1,
      };
      const expectedText = testHistoryRequest + '\n';
      const expectedEdit = {
        range: expectedRange,
        text: expectedText,
        forceMoveMarkers: true,
      };
      expect(editor.executeEdits).toHaveBeenCalledTimes(1);
      expect(editor.executeEdits).toHaveBeenCalledWith('restoreFromHistory', [expectedEdit]);
    });

    it('insert the request at the end of the selected request', async () => {
      // the position of the cursor is at the end of line 4
      editor.getPosition.mockReturnValue({
        lineNumber: 4,
        column: 2,
      } as monaco.Position);
      editor.getSelection.mockReturnValue({
        startLineNumber: 4,
        endLineNumber: 4,
      } as monaco.Selection);
      await editorActionsProvider.restoreRequestFromHistory(testHistoryRequest);
      const expectedRange = {
        startLineNumber: 4,
        startColumn: 2,
        endLineNumber: 4,
        endColumn: 2,
      };
      const expectedText = '\n' + testHistoryRequest;
      const expectedEdit = {
        range: expectedRange,
        text: expectedText,
        forceMoveMarkers: true,
      };
      expect(editor.executeEdits).toHaveBeenCalledTimes(1);
      expect(editor.executeEdits).toHaveBeenCalledWith('restoreFromHistory', [expectedEdit]);
    });

    it('insert at the beginning of the line, if no selected request', async () => {
      // mock no parsed requests
      mockGetParsedRequests.mockReturnValue([]);
      // the position of the cursor is at the end of line 4
      editor.getPosition.mockReturnValue({
        lineNumber: 4,
        column: 2,
      } as monaco.Position);
      editor.getSelection.mockReturnValue({
        startLineNumber: 4,
        endLineNumber: 4,
      } as monaco.Selection);
      await editorActionsProvider.restoreRequestFromHistory(testHistoryRequest);
      const expectedRange = {
        startLineNumber: 4,
        startColumn: 1,
        endLineNumber: 4,
        endColumn: 1,
      };
      const expectedText = testHistoryRequest + '\n';
      const expectedEdit = {
        range: expectedRange,
        text: expectedText,
        forceMoveMarkers: true,
      };
      expect(editor.executeEdits).toHaveBeenCalledTimes(1);
      expect(editor.executeEdits).toHaveBeenCalledWith('restoreFromHistory', [expectedEdit]);
    });
  });
});
