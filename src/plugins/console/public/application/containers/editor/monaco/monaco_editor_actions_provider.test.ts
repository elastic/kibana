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
      getTopForLineNumber: jest.fn(),
      getScrollTop: jest.fn(),
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
});
