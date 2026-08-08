/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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

jest.mock('../../../services', () => {
  return {
    getStorage: () => ({
      get: () => [],
    }),
    StorageKeys: {
      VARIABLES: 'test',
    },
  };
});

jest.mock('../../../lib/autocomplete/engine', () => {
  return {
    populateContext: (...args: any) => {
      mockPopulateContext(args);
    },
  };
});

jest.mock('../../hooks', () => ({
  sendRequest: jest.fn(),
}));

import { MonacoEditorActionsProvider } from './monaco_editor_actions_provider';
import type { monaco } from '@kbn/monaco';
import { createParser } from '@kbn/monaco/src/languages/console/parser';
import { sendRequest } from '../../hooks';
import { serviceContextMock } from '../../contexts/services_context.mock';
import { _test as kbTest } from '../../../lib/kb';
import { getFallbackRequestStartPosition } from '@kbn/monaco/src/languages/console/utils';

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
      onKeyUp: jest.fn(),
      getSelection: jest.fn(),
      getPosition: jest.fn(),
      getTopForLineNumber: jest.fn(),
      getScrollTop: jest.fn(),
      trigger: jest.fn(),
      executeEdits: jest.fn(),
      setPosition: jest.fn(),
    } as unknown as jest.Mocked<monaco.editor.IStandaloneCodeEditor>;

    editor.getModel.mockReturnValue({
      getLineMaxColumn: () => 10,
      getPositionAt: () => ({ lineNumber: 1 }),
      getLineContent: () => 'GET _search',
      getLineCount: () => 1,
      getOffsetAt: () => 0,
      getValueInRange: () => 'GET _search',
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

    editorActionsProvider = new MonacoEditorActionsProvider(
      editor,
      setEditorActionsCssMock,
      '.sampleHighlightedLinesClassName'
    );
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

    it.each(['//', '#'])(
      'removes %s comments from the request body while preserving triple-quote strings',
      async (commentMarker) => {
        // Regression test for https://github.com/elastic/kibana/issues/277160
        const content = [
          'POST _watcher/watch/test',
          '{',
          `  ${commentMarker} watch metadata`,
          '  "script": """',
          '    return 1; // painless comment',
          '  """',
          '}',
        ];
        const totalLength = content.join('\n').length;
        editor.getModel.mockReturnValue({
          getLineContent: (lineNumber: number) => content[lineNumber - 1],
          getValueInRange: ({
            startLineNumber,
            endLineNumber,
          }: {
            startLineNumber: number;
            endLineNumber: number;
          }) => content.slice(startLineNumber - 1, endLineNumber).join('\n'),
          getLineMaxColumn: (lineNumber: number) => content[lineNumber - 1].length + 1,
          getPositionAt: (offset: number) => ({ lineNumber: offset === 0 ? 1 : content.length }),
          getLineCount: () => content.length,
        } as unknown as monaco.editor.ITextModel);
        editor.getSelection.mockReturnValue({
          startLineNumber: 1,
          endLineNumber: content.length,
        } as unknown as monaco.Selection);
        mockGetParsedRequests.mockResolvedValue([
          {
            startOffset: 0,
            endOffset: totalLength,
            method: 'POST',
            url: '_watcher/watch/test',
          },
        ]);

        const curl = await editorActionsProvider.getCurl('http://localhost');
        expect(curl).not.toContain('watch metadata');
        expect(curl).toContain('return 1; // painless comment');
        // The body sent in the curl command is valid JSON
        const body = curl.split(`-d'\n`)[1].slice(0, -1);
        expect(JSON.parse(body)).toEqual({
          script: '\n    return 1; // painless comment\n  ',
        });
      }
    );
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

    it('returns the kibana API reference link for a kbn: request with no matching operation', async () => {
      editor.getModel.mockReturnValue({
        getLineMaxColumn: () => 26,
        getPositionAt: () => ({ lineNumber: 1 }),
        getLineContent: () => 'GET kbn:/api/spaces/space',
      } as unknown as monaco.editor.ITextModel);
      mockGetParsedRequests.mockResolvedValue([
        {
          startOffset: 0,
          endOffset: 26,
          method: 'GET',
          url: 'kbn:/api/spaces/space',
        },
      ]);
      const kibanaApiReferenceLink = 'http://elastic.co/docs/api/doc/kibana/';
      const link = await editorActionsProvider.getDocumentationLink(
        docLinkVersion,
        kibanaApiReferenceLink
      );
      expect(link).toBe(kibanaApiReferenceLink);
    });

    it('returns the specific operation deep link for a kbn: request that matches the doc links map', async () => {
      kbTest.setKibanaApiDocLinks({
        '/api/spaces/space/{id}': { get: 'get-spaces-space-id' },
      });
      editor.getModel.mockReturnValue({
        getLineMaxColumn: () => 34,
        getPositionAt: () => ({ lineNumber: 1 }),
        getLineContent: () => 'GET kbn:/api/spaces/space/default',
      } as unknown as monaco.editor.ITextModel);
      mockGetParsedRequests.mockResolvedValue([
        {
          startOffset: 0,
          endOffset: 34,
          method: 'GET',
          url: 'kbn:/api/spaces/space/default',
        },
      ]);
      const kibanaApiReferenceLink = 'http://elastic.co/docs/api/doc/kibana/';
      const link = await editorActionsProvider.getDocumentationLink(
        docLinkVersion,
        kibanaApiReferenceLink
      );
      expect(link).toBe(
        'http://elastic.co/docs/api/doc/kibana/operation/operation-get-spaces-space-id'
      );
      kbTest.setKibanaApiDocLinks({});
    });

    it('returns null for a kbn: request when no kibana API reference link is provided', async () => {
      editor.getModel.mockReturnValue({
        getLineMaxColumn: () => 26,
        getPositionAt: () => ({ lineNumber: 1 }),
        getLineContent: () => 'GET kbn:/api/spaces/space',
      } as unknown as monaco.editor.ITextModel);
      mockGetParsedRequests.mockResolvedValue([
        {
          startOffset: 0,
          endOffset: 26,
          method: 'GET',
          url: 'kbn:/api/spaces/space',
        },
      ]);
      const link = await editorActionsProvider.getDocumentationLink(docLinkVersion);
      expect(link).toBe(null);
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
      getOffsetAt: () => 0,
      getLineCount: () => 1,
      getLineContent: () => 'GET ',
      getValueInRange: () => 'GET ',
    } as unknown as jest.Mocked<monaco.editor.ITextModel>;
    const mockPosition = { lineNumber: 1, column: 1 } as jest.Mocked<monaco.Position>;
    const mockContext = {} as jest.Mocked<monaco.languages.CompletionContext>;
    it('returns completion items for method if no requests', async () => {
      mockGetParsedRequests.mockResolvedValue([]);
      const completionItems = await editorActionsProvider.provideCompletionItems(
        mockModel,
        mockPosition,
        mockContext
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

    it('orders method suggestions with GET first and DELETE last using sortText', async () => {
      // Monaco sorts completion items by sortText, falling back to label. Without
      // an explicit sortText, alphabetical sorting puts DELETE first (#259251).
      mockGetParsedRequests.mockResolvedValue([]);
      const completionItems = await editorActionsProvider.provideCompletionItems(
        mockModel,
        mockPosition,
        mockContext
      );
      const sortedByMonaco = [...(completionItems?.suggestions ?? [])].sort((a, b) =>
        String(a.sortText ?? a.label).localeCompare(String(b.sortText ?? b.label))
      );
      const orderedLabels = sortedByMonaco.map((s) => s.label);
      expect(orderedLabels[0]).toBe('GET');
      expect(orderedLabels[orderedLabels.length - 1]).toBe('DELETE');
      expect(orderedLabels).toEqual(['GET', 'POST', 'PUT', 'PATCH', 'HEAD', 'DELETE']);
    });

    it('does not suggest methods when the line begins with a quote', async () => {
      // A blank-ish line containing only a starting double quote is not a
      // request line; method suggestions should not be offered there. The
      // parser still emits a partial request (`startOffset` only) when it
      // fails to match a method, so the autocomplete provider must guard
      // both branches: with and without a parsed request on the line.
      mockGetParsedRequests.mockResolvedValue([{ startOffset: 0 }]);
      const quoteLineModel = {
        ...mockModel,
        getLineContent: () => '"',
        getValueInRange: () => '"',
      } as unknown as jest.Mocked<monaco.editor.ITextModel>;
      const completionItems = await editorActionsProvider.provideCompletionItems(
        quoteLineModel,
        mockPosition,
        mockContext
      );
      expect(completionItems?.suggestions).toEqual([]);
    });

    it('does not suggest methods when the cursor is before a quote-starting line', async () => {
      mockGetParsedRequests.mockResolvedValue([{ startOffset: 0 }]);
      const quoteLineModel = {
        ...mockModel,
        getLineContent: () => '"key": "value"',
        getValueInRange: () => '',
      } as unknown as jest.Mocked<monaco.editor.ITextModel>;
      const completionItems = await editorActionsProvider.provideCompletionItems(
        quoteLineModel,
        mockPosition,
        mockContext
      );
      expect(completionItems?.suggestions).toEqual([]);
    });

    it('does not suggest methods when there is no parsed request and the line begins with a quote', async () => {
      // When the parser produces no request at all (e.g. on a totally fresh
      // line), the no-request branch must also be guarded.
      mockGetParsedRequests.mockResolvedValue([]);
      const quoteLineModel = {
        ...mockModel,
        getLineContent: () => '"',
        getValueInRange: () => '"',
      } as unknown as jest.Mocked<monaco.editor.ITextModel>;
      const completionItems = await editorActionsProvider.provideCompletionItems(
        quoteLineModel,
        mockPosition,
        mockContext
      );
      expect(completionItems?.suggestions).toEqual([]);
    });

    it.each(['}', ']'])(
      'does not suggest methods when the line contains only %s',
      async (lineContent) => {
        mockGetParsedRequests.mockResolvedValue([{ startOffset: 0 }]);
        const bodyLineModel = {
          ...mockModel,
          getLineContent: () => lineContent,
          getValueInRange: () => lineContent,
        } as unknown as jest.Mocked<monaco.editor.ITextModel>;
        const completionItems = await editorActionsProvider.provideCompletionItems(
          bodyLineModel,
          mockPosition,
          mockContext
        );
        expect(completionItems?.suggestions).toEqual([]);
      }
    );

    it('still suggests methods when the line is empty (preserves empty-line behavior)', async () => {
      mockGetParsedRequests.mockResolvedValue([]);
      const emptyLineModel = {
        ...mockModel,
        getLineContent: () => '',
        getValueInRange: () => '',
      } as unknown as jest.Mocked<monaco.editor.ITextModel>;
      const completionItems = await editorActionsProvider.provideCompletionItems(
        emptyLineModel,
        mockPosition,
        mockContext
      );
      expect(completionItems?.suggestions.map((suggestion) => suggestion.label)).toEqual(
        expect.arrayContaining(['GET', 'POST'])
      );
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
        mockContext
      );
      expect(completionItems?.suggestions.length).toBe(2);
      const endpoints = completionItems?.suggestions.map((suggestion) => suggestion.label);
      expect((endpoints as string[]).sort()).toEqual(['_cat', '_search']);
    });
  });

  describe('triggerSuggestions', () => {
    /*
     * Regression tests for https://github.com/elastic/kibana/issues/257917
     *
     * While a triple-quoted string is still unterminated, the Console parser reports the
     * request without an `endOffset`. `getRequestEndLineNumber` then falls back to the last
     * non-empty line, so a cursor on the trailing empty line sits *past* the request's
     * computed `endLineNumber` and no request matches the cursor. Without a fallback,
     * `isPositionInsideTripleQuotesAndQuery` reported `insideTripleQuotes: false` and
     * suggestions were triggered inside a non-query string.
     */
    const createModel = (lines: string[]) => {
      const getPositionAt = jest.fn((offset: number) => {
        let remainingOffset = offset;
        for (const [index, line] of lines.entries()) {
          if (remainingOffset <= line.length) {
            return { lineNumber: index + 1, column: remainingOffset + 1 };
          }
          remainingOffset -= line.length + 1;
        }
        return { lineNumber: lines.length, column: lines.at(-1)?.length ?? 1 };
      });
      const getOffsetAt = jest.fn(({ lineNumber, column }: monaco.IPosition) => {
        const precedingLinesLength = lines
          .slice(0, lineNumber - 1)
          .reduce((length, line) => length + line.length + 1, 0);
        return precedingLinesLength + column - 1;
      });
      const getValueInRange = jest.fn(
        ({ startLineNumber, startColumn, endLineNumber, endColumn }: monaco.IRange) => {
          if (startLineNumber === endLineNumber) {
            return (lines[startLineNumber - 1] ?? '').slice(startColumn - 1, endColumn - 1);
          }

          const selectedLines = lines.slice(startLineNumber - 1, endLineNumber);
          selectedLines[0] = selectedLines[0].slice(startColumn - 1);
          selectedLines[selectedLines.length - 1] = selectedLines[selectedLines.length - 1].slice(
            0,
            endColumn - 1
          );
          return selectedLines.join('\n');
        }
      );
      const getWordUntilPosition = jest.fn(({ column }: monaco.IPosition) => ({
        word: '',
        startColumn: column,
        endColumn: column,
      }));
      return {
        getVersionId: jest.fn(() => 1),
        getLineCount: () => lines.length,
        getLineContent: (lineNumber: number) => lines[lineNumber - 1] ?? '',
        getOffsetAt,
        getPositionAt,
        getValueInRange,
        getWordUntilPosition,
      } as unknown as jest.Mocked<monaco.editor.ITextModel>;
    };

    const triggerSuggestions = async () => {
      (
        editorActionsProvider as unknown as {
          triggerSuggestions: () => void;
        }
      ).triggerSuggestions();
      // `triggerSuggestions` is sync but resolves its triple-quote check internally. Yielding
      // once via `setImmediate` lets that promise chain settle however many `await`s it has,
      // unlike a fixed number of microtask ticks.
      await new Promise((resolve) => setImmediate(resolve));
    };

    // The shape the real parser returns for an unterminated triple-quoted string:
    // a single request with no `endOffset`.
    const unterminatedRequest = [{ startOffset: 0 }];

    const setup = (lines: string[], positionLineNumber = lines.length, positionColumn = 1) => {
      editor.getPosition.mockReturnValue({
        lineNumber: positionLineNumber,
        column: positionColumn,
      } as monaco.Position);
      const model = createModel(lines);
      editor.getModel.mockReturnValue(model);
      editor.getSelection.mockReturnValue({
        startLineNumber: positionLineNumber,
        endLineNumber: positionLineNumber,
      } as unknown as monaco.Selection);
      return model;
    };

    it('does not trigger suggestions inside non-query triple quotes', async () => {
      mockGetParsedRequests.mockResolvedValue(unterminatedRequest);
      setup(['POST _query', '{', '\t"script": """', '']);
      mockGetParsedRequests.mockClear();

      await triggerSuggestions();

      expect(editor.trigger).not.toHaveBeenCalled();
      expect(mockGetParsedRequests).toHaveBeenCalledTimes(1);
    });

    it('still triggers suggestions inside ES|QL query triple quotes', async () => {
      mockGetParsedRequests.mockResolvedValue(unterminatedRequest);
      setup(['POST _query', '{', '\t"query": """', '']);

      await triggerSuggestions();

      expect(editor.trigger).toHaveBeenCalledWith(
        'Trigger suggestions',
        'editor.action.triggerSuggest',
        {}
      );
    });

    it('does not trigger suggestions inside non-query triple quotes when no request is parsed', async () => {
      mockGetParsedRequests.mockResolvedValue([]);
      setup(['POST _query', '{', '\t"script": """', '']);

      await triggerSuggestions();

      expect(editor.trigger).not.toHaveBeenCalled();
    });

    it('does not mistake request-like triple-quoted content for a request when none is parsed', async () => {
      mockGetParsedRequests.mockResolvedValue([]);
      setup(['POST _query', '{', '\t"script": """', 'GET /not-a-request', '']);

      await triggerSuggestions();

      expect(editor.trigger).not.toHaveBeenCalled();
    });

    it('does not mistake parser-recovered triple-quoted content for a request line', async () => {
      const lines = ['POST _query', '{', '\t"script": """', 'GET /not-a-request', ''];
      const recoveredRequestOffset = lines.slice(0, 3).join('\n').length + 1;
      mockGetParsedRequests.mockResolvedValue([
        { startOffset: 0, endOffset: recoveredRequestOffset - 2 },
        {
          startOffset: recoveredRequestOffset,
          endOffset: lines.join('\n').length,
        },
      ]);
      setup(lines);

      await triggerSuggestions();

      expect(editor.trigger).not.toHaveBeenCalled();
    });

    it('does not trust a selected parser-recovered request inside triple-quoted content', async () => {
      const lines = ['POST _search', '{"script": """', 'GET /not-a-request'];
      const parsedRequests = createParser()(lines.join('\n'))?.requests ?? [];
      mockGetParsedRequests.mockResolvedValue(parsedRequests);
      setup(lines, 3, 5);

      await triggerSuggestions();

      expect(editor.trigger).not.toHaveBeenCalled();
    });

    it('does not trigger suggestions after the cursor moves while requests resolve', async () => {
      const lines = ['POST _query', '{"query":"""', '  "', 'GET /not-a-request', ''];
      const parsedRequests = createParser()(lines.join('\n'))?.requests ?? [];
      let resolveParsedRequests: (requests: typeof parsedRequests) => void = () => {};
      mockGetParsedRequests.mockReturnValue(
        new Promise<typeof parsedRequests>((resolve) => {
          resolveParsedRequests = resolve;
        })
      );
      setup(lines, 3, 4);

      (
        editorActionsProvider as unknown as {
          triggerSuggestions: () => void;
        }
      ).triggerSuggestions();
      editor.getPosition.mockReturnValue({ lineNumber: 4, column: 1 } as monaco.Position);
      editor.getSelection.mockReturnValue({
        startLineNumber: 4,
        endLineNumber: 4,
      } as unknown as monaco.Selection);
      resolveParsedRequests(parsedRequests);
      await new Promise((resolve) => setImmediate(resolve));

      expect(editor.trigger).not.toHaveBeenCalled();
    });

    it('does not trigger suggestions after the model changes while requests resolve', async () => {
      const lines = ['POST _query', '{"query":"""', '  "'];
      const parsedRequests = createParser()(lines.join('\n'))?.requests ?? [];
      let resolveParsedRequests: (requests: typeof parsedRequests) => void = () => {};
      mockGetParsedRequests.mockReturnValue(
        new Promise<typeof parsedRequests>((resolve) => {
          resolveParsedRequests = resolve;
        })
      );
      const model = setup(lines, 3, 4);

      (
        editorActionsProvider as unknown as {
          triggerSuggestions: () => void;
        }
      ).triggerSuggestions();
      model.getVersionId.mockReturnValue(2);
      resolveParsedRequests(parsedRequests);
      await new Promise((resolve) => setImmediate(resolve));

      expect(editor.trigger).not.toHaveBeenCalled();
    });

    it('resolves the request from the cursor line, not the selection', async () => {
      const lines = ['POST _query', '{', '  "script": """', '', 'GET _search', '{}'];
      mockGetParsedRequests.mockResolvedValue([
        { startOffset: 0, endOffset: 29 },
        { startOffset: 31, endOffset: 44 },
      ]);
      setup(lines, 4, 1);
      // A selection spanning requests below the cursor must not change the outcome: the cursor
      // sits inside the unterminated triple quote, so no suggestions may open.
      editor.getSelection.mockReturnValue({
        startLineNumber: 4,
        endLineNumber: 6,
      } as unknown as monaco.Selection);

      await triggerSuggestions();

      expect(editor.trigger).not.toHaveBeenCalled();
    });

    it.each([
      {
        lines: ['GET/foo', '{"x":"""', 'GET _search', ''],
        requests: [
          { startOffset: 0, endOffset: 16 },
          { startOffset: 17, endOffset: 28 },
        ],
      },
      {
        lines: ['GET\u00a0/foo', '{"x":"""', 'GET _search', ''],
        requests: [
          { startOffset: 0, endOffset: 17 },
          { startOffset: 18, endOffset: 29 },
        ],
      },
      {
        lines: ['\u00a0GET /foo', '{"x":"""', 'GET _search', ''],
        requests: [
          { startOffset: 0, endOffset: 0 },
          { startOffset: 1, endOffset: 17 },
          { startOffset: 19, endOffset: 30 },
        ],
      },
      {
        lines: ['GET /foo', '{"x"} : """', 'GET _search', ''],
        requests: [
          { startOffset: 0, endOffset: 20 },
          { startOffset: 21, endOffset: 32 },
        ],
      },
    ])(
      'does not anchor a valid request to malformed request content: $lines',
      async ({ lines, requests }) => {
        mockGetParsedRequests.mockResolvedValue(requests);
        setup(lines);

        await triggerSuggestions();

        expect(editor.trigger).toHaveBeenCalledWith(
          'Trigger suggestions',
          'editor.action.triggerSuggest',
          {}
        );
      }
    );

    it('checks nearby parser recovery before an oversized earlier request', async () => {
      const oversizedRequestLine = `GET /${'x'.repeat(100_000)}`;
      const lines = [oversizedRequestLine, 'POST _query', '{', '  "script": """', 'GET '];
      const currentRequestOffset = oversizedRequestLine.length + 1;
      const recoveredRequestOffset = lines.slice(0, 4).join('\n').length + 1;
      mockGetParsedRequests.mockResolvedValue([
        { startOffset: 0, endOffset: oversizedRequestLine.length },
        { startOffset: currentRequestOffset, endOffset: recoveredRequestOffset - 2 },
        { startOffset: recoveredRequestOffset },
      ]);
      setup(lines, 5, 5);

      await triggerSuggestions();

      expect(editor.trigger).not.toHaveBeenCalled();
    });

    it('ignores recovered request content after the cursor when applying bounds', async () => {
      const lines = [
        'POST _query',
        '{"script":"""',
        'GET /not-a-request',
        '',
        `{"field":"${'x'.repeat(100_001)}"}`,
      ];
      mockGetParsedRequests.mockResolvedValue([
        { startOffset: 0, endOffset: 24 },
        { startOffset: 26, endOffset: 100_059 },
      ]);
      setup(lines, 4);

      await triggerSuggestions();

      expect(editor.trigger).not.toHaveBeenCalled();
    });

    it('anchors a request that follows an inline block comment', async () => {
      const lines = ['/* c */ POST _query', '{', '  "script": """', 'GET /not-a-request', ''];
      mockGetParsedRequests.mockResolvedValue([
        { startOffset: 8, endOffset: 36 },
        { startOffset: 38, endOffset: 56 },
      ]);
      setup(lines);

      await triggerSuggestions();

      expect(editor.trigger).not.toHaveBeenCalled();
    });

    it('preserves ES|QL suggestions after an inline block comment', async () => {
      const lines = ['/* c */ POST _query', '{', '  "query": """', 'GET /not-a-request', ''];
      mockGetParsedRequests.mockResolvedValue([
        { startOffset: 8, endOffset: 35 },
        { startOffset: 37, endOffset: 55 },
      ]);
      setup(lines);

      await triggerSuggestions();

      expect(editor.trigger).toHaveBeenCalledWith(
        'Trigger suggestions',
        'editor.action.triggerSuggest',
        {}
      );
    });

    it('preserves ES|QL suggestions in a selected inline-comment request', async () => {
      const lines = ['/* c */ POST _query', '{', '  "query": """'];
      mockGetParsedRequests.mockResolvedValue([{ startOffset: 8 }]);
      setup(lines, 3, lines[2].length + 1);

      await triggerSuggestions();

      expect(editor.trigger).toHaveBeenCalledWith(
        'Trigger suggestions',
        'editor.action.triggerSuggest',
        {}
      );
    });

    it('rejects a same-line recovered request after malformed JSON', async () => {
      const lines = ['GET /foo', '{"x"} POST _query', '{"query": """'];
      mockGetParsedRequests.mockResolvedValue([
        { startOffset: 0, endOffset: 13 },
        { startOffset: 15 },
      ]);
      setup(lines, 3, lines[2].length + 1);

      await triggerSuggestions();

      expect(editor.trigger).not.toHaveBeenCalled();
    });

    it('triggers suggestions after a completed triple quote containing a request-like line', async () => {
      const lines = ['POST _query', '{', '\t"script": """', 'GET /not-a-request', '"""', '}', ''];
      mockGetParsedRequests.mockResolvedValue([
        {
          startOffset: 0,
          endOffset: lines.slice(0, -1).join('\n').length,
          method: 'POST',
          url: '_query',
        },
      ]);
      setup(lines);

      await triggerSuggestions();

      expect(editor.trigger).toHaveBeenCalledWith(
        'Trigger suggestions',
        'editor.action.triggerSuggest',
        {}
      );
    });

    it('ignores triple quotes in comments before the current request', async () => {
      const lines = ['GET _search', '{}', '# """', 'GET _search', ''];
      const secondRequestOffset = lines.slice(0, 3).join('\n').length + 1;
      mockGetParsedRequests.mockResolvedValue([
        { startOffset: 0, endOffset: lines[0].length + lines[1].length + 1 },
        {
          startOffset: secondRequestOffset,
          endOffset: lines.slice(0, -1).join('\n').length,
        },
      ]);
      setup(lines);

      await triggerSuggestions();

      expect(editor.trigger).toHaveBeenCalledWith(
        'Trigger suggestions',
        'editor.action.triggerSuggest',
        {}
      );
    });

    it('does not treat request-like text inside a block comment as the request start', async () => {
      const lines = ['/*', 'GET /not-a-request', '"""', '*/', 'GET _search', ''];
      const requestOffset = lines.slice(0, 4).join('\n').length + 1;
      mockGetParsedRequests.mockResolvedValue([
        {
          startOffset: requestOffset,
          endOffset: lines.slice(0, -1).join('\n').length,
        },
      ]);
      setup(lines);

      await triggerSuggestions();

      expect(editor.trigger).toHaveBeenCalledWith(
        'Trigger suggestions',
        'editor.action.triggerSuggest',
        {}
      );
    });

    it('handles an escaped-backslash string before the current triple-quoted request', async () => {
      mockGetParsedRequests.mockResolvedValue([]);
      setup(['GET _search', '{"path":"\\\\"}', 'POST _query', '{', '\t"script": """', '']);

      await triggerSuggestions();

      expect(editor.trigger).not.toHaveBeenCalled();
    });

    it.each([
      {
        lines: ['"""', 'GET _search', ''],
        requests: [
          { startOffset: 0, endOffset: 3 },
          { startOffset: 4, endOffset: 15 },
        ],
      },
      {
        lines: ['GET', '"""', 'GET _search', ''],
        requests: [
          { startOffset: 0, endOffset: 7 },
          { startOffset: 8, endOffset: 19 },
        ],
      },
      {
        lines: ['GET/foo', '"""', 'GET _search', ''],
        requests: [
          { startOffset: 0, endOffset: 11 },
          { startOffset: 12, endOffset: 23 },
        ],
      },
      {
        lines: ['GET /foo', '"""', 'GET _search', ''],
        requests: [
          { startOffset: 0, endOffset: 8 },
          { startOffset: 9, endOffset: 12 },
          { startOffset: 13, endOffset: 24 },
        ],
      },
      {
        lines: ['GET /foo', '{', '"""', 'GET _search', ''],
        requests: [
          { startOffset: 0, endOffset: 13 },
          { startOffset: 15, endOffset: 26 },
        ],
      },
    ])('ignores malformed parser artifacts before a parsed request: $lines', async (fixture) => {
      mockGetParsedRequests.mockResolvedValue(fixture.requests);
      setup(fixture.lines);

      await triggerSuggestions();

      expect(editor.trigger).toHaveBeenCalledWith(
        'Trigger suggestions',
        'editor.action.triggerSuggest',
        {}
      );
    });

    it('keeps a comment-separated triple-quoted value anchored to its request', async () => {
      const lines = [
        'POST _query',
        '{',
        '  "script":',
        '  # value comment',
        '  """',
        'GET /not-a-request',
        '',
      ];
      mockGetParsedRequests.mockResolvedValue([
        { startOffset: 0, endOffset: 48 },
        { startOffset: 50, endOffset: 68 },
      ]);
      setup(lines);

      await triggerSuggestions();

      expect(editor.trigger).not.toHaveBeenCalled();
    });

    it('caps malformed parsed-request inspection', () => {
      const lines = new Array(2501).fill('"""');
      const model = createModel(lines);
      const parsedRequests = lines.map((_, index) => ({ startOffset: index * 4 }));

      const result = getFallbackRequestStartPosition(parsedRequests, model, lines.length);

      expect(result).toBeUndefined();
      expect(model.getPositionAt).toHaveBeenCalledTimes(2000);
    });

    it('caps parsed-request inspection by source characters', () => {
      const lines = ['GET /one', 'x'.repeat(100_001)];
      const model = createModel(lines);
      const parsedRequests = [{ startOffset: 0 }, { startOffset: lines[0].length + 1 }];

      const result = getFallbackRequestStartPosition(parsedRequests, model, lines.length);

      expect(result).toBeUndefined();
      expect(model.getPositionAt).toHaveBeenCalledTimes(1);
    });

    it('caps cumulative parsed-request materialization', () => {
      const lines = [
        `GET /${'one'.repeat(16_667)}`,
        `GET /${'two'.repeat(16_667)}`,
        `GET /${'three'.repeat(3_333)}`,
      ];
      const model = createModel(lines);
      const secondStartOffset = lines[0].length + 1;
      const thirdStartOffset = secondStartOffset + lines[1].length + 1;
      const parsedRequests = [
        { startOffset: 0, endOffset: lines[0].length },
        { startOffset: secondStartOffset, endOffset: secondStartOffset + lines[1].length },
        { startOffset: thirdStartOffset, endOffset: thirdStartOffset + lines[2].length },
      ];

      const result = getFallbackRequestStartPosition(parsedRequests, model, lines.length);

      expect(result).toEqual({ lineNumber: 3, column: 1 });
      expect(model.getValueInRange).toHaveBeenCalledTimes(1);
    });

    it('does not return an oversized unterminated request as the fallback start', () => {
      const lines = ['GET /foo', 'x'.repeat(100_001)];
      const model = createModel(lines);
      const parsedRequests = [{ startOffset: 0 }];

      const result = getFallbackRequestStartPosition(parsedRequests, model, lines.length);

      expect(result).toBeUndefined();
      expect(model.getValueInRange).not.toHaveBeenCalled();
    });

    it('excludes an inline comment prefix from parsed request materialization', () => {
      const prefix = `/*${'x'.repeat(100_000)}*/ `;
      const lines = [`${prefix}GET /foo`, '{"field": true}'];
      const model = createModel(lines);
      const parsedRequests = [{ startOffset: prefix.length, endOffset: lines.join('\n').length }];

      const result = getFallbackRequestStartPosition(parsedRequests, model, lines.length);

      expect(result).toEqual({ lineNumber: 1, column: prefix.length + 1 });
      expect(model.getValueInRange).toHaveBeenCalledWith(
        expect.objectContaining({ startLineNumber: 1, startColumn: prefix.length + 1 })
      );
    });

    it('continues past a parsed request without an end offset', () => {
      const lines = ['POST _query', '{"script":"""', 'POST _query', '{'];
      const model = createModel(lines);
      const parsedRequests = [{ startOffset: 0, endOffset: 24 }, { startOffset: 26 }];

      const result = getFallbackRequestStartPosition(parsedRequests, model, lines.length);

      expect(result).toEqual({ lineNumber: 1, column: 1 });
    });

    it('stops inspecting parsed requests after passing the cursor', async () => {
      const lines = ['"""', 'GET _search', '', ...new Array(2500).fill('GET _search')];
      let requestOffset = lines.slice(0, 3).join('\n').length + 1;
      const laterRequests = new Array(2500).fill(undefined).map(() => {
        const request = { startOffset: requestOffset, endOffset: requestOffset + 11 };
        requestOffset += 12;
        return request;
      });
      mockGetParsedRequests.mockResolvedValue([
        { startOffset: 0, endOffset: lines[0].length },
        { startOffset: lines[0].length + 1, endOffset: lines.slice(0, 2).join('\n').length },
        ...laterRequests,
      ]);
      const model = setup(lines, 3);

      await triggerSuggestions();

      expect(model.getOffsetAt).toHaveBeenCalledTimes(1);
      expect(model.getPositionAt).toHaveBeenCalledTimes(9);
    });

    describe('provideCompletionItems (manual/trigger-character invocations)', () => {
      const provideCompletionItems = (
        model: monaco.editor.ITextModel,
        position: monaco.IPosition
      ) =>
        editorActionsProvider.provideCompletionItems(
          model,
          position as monaco.Position,
          {} as monaco.languages.CompletionContext
        );

      it('returns no completion items inside non-query triple quotes', async () => {
        mockGetParsedRequests.mockResolvedValue([{ startOffset: 0 }]);
        const model = setup(['POST _query', '{', '  "script": """', '']);

        const { suggestions } = await provideCompletionItems(model, { lineNumber: 4, column: 1 });

        expect(suggestions).toHaveLength(0);
      });

      it('still returns method completion items on an empty line outside triple quotes', async () => {
        mockGetParsedRequests.mockResolvedValue([{ startOffset: 0, endOffset: 14 }]);
        const model = setup(['GET _search', '{}', '']);

        const { suggestions } = await provideCompletionItems(model, { lineNumber: 3, column: 1 });

        expect(suggestions.map(({ label }) => label)).toEqual(
          expect.arrayContaining(['GET', 'POST'])
        );
      });
    });

    it('still triggers suggestions inside ES|QL query triple quotes when no request is parsed', async () => {
      mockGetParsedRequests.mockResolvedValue([]);
      setup(['POST _query', '{', '\t"query": """', '']);

      await triggerSuggestions();

      expect(editor.trigger).toHaveBeenCalledWith(
        'Trigger suggestions',
        'editor.action.triggerSuggest',
        {}
      );
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

  describe('isKbnRequestSelected', () => {
    beforeEach(() => {
      /*
       * The editor has the text
       * "POST _search" on line 1
       *  and "GET kbn:test" on line 2
       */
      mockGetParsedRequests.mockReturnValue([
        {
          startOffset: 0,
          method: 'POST',
          url: '_search',
          endOffset: 12,
        },
        {
          startOffset: 13,
          method: 'GET',
          url: 'kbn:test',
          endOffset: 25,
        },
      ]);

      editor.getModel.mockReturnValue({
        getPositionAt: (offset: number) => {
          // mock this function for start and end offsets of the mocked requests
          if (offset === 0) {
            return { lineNumber: 1, column: 1 };
          }
          if (offset === 12) {
            return { lineNumber: 1, column: 12 };
          }
          if (offset === 13) {
            return { lineNumber: 2, column: 1 };
          }
          if (offset === 25) {
            return { lineNumber: 2, column: 13 };
          }
        },
        getLineContent: (lineNumber: number) => {
          // mock this function for line 1 and line 2
          if (lineNumber === 1) {
            return 'POST _search';
          }
          if (lineNumber === 2) {
            return 'GET kbn:test';
          }
        },
      } as unknown as monaco.editor.ITextModel);
    });

    it('returns false if no requests', async () => {
      mockGetParsedRequests.mockResolvedValue([]);
      expect(await editorActionsProvider.isKbnRequestSelected()).toEqual(false);
    });

    it('returns true if a Kibana request is selected', async () => {
      editor.getSelection.mockReturnValue({
        startLineNumber: 2,
        endLineNumber: 2,
      } as monaco.Selection);

      expect(await editorActionsProvider.isKbnRequestSelected()).toEqual(true);
    });

    it('returns false if a non-Kibana request is selected', async () => {
      editor.getSelection.mockReturnValue({
        startLineNumber: 1,
        endLineNumber: 1,
      } as monaco.Selection);

      expect(await editorActionsProvider.isKbnRequestSelected()).toEqual(false);
    });

    it('returns true if multiple requests are selected and one of them is a Kibana request', async () => {
      editor.getSelection.mockReturnValue({
        startLineNumber: 1,
        endLineNumber: 2,
      } as monaco.Selection);

      expect(await editorActionsProvider.isKbnRequestSelected()).toEqual(true);
    });
  });

  describe('sendRequests', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('falls back to server default and clears stale host when stored host is not in the allowlist', async () => {
      (sendRequest as jest.Mock).mockResolvedValue([]);

      const context = serviceContextMock.create();
      jest
        .spyOn(context.services.settings, 'getSelectedHost')
        .mockReturnValue('http://localhost:9300/');
      const setSelectedHostSpy = jest.spyOn(context.services.settings, 'setSelectedHost');
      jest.spyOn(context.services.esHostService, 'waitForInitialization').mockResolvedValue();
      jest
        .spyOn(context.services.esHostService, 'getAllHosts')
        .mockReturnValue(['https://localhost:9200/']);

      // Use a custom provider that includes getErrors so sendRequests can proceed past validation
      const provider = new MonacoEditorActionsProvider(editor, jest.fn(), '.className', {
        getRequests: jest
          .fn()
          .mockResolvedValue([{ startOffset: 0, endOffset: 11, method: 'GET', url: '_search' }]),
        getErrors: jest.fn().mockResolvedValue([]),
      } as any);

      await provider.sendRequests(jest.fn(), context);

      expect(sendRequest).toHaveBeenCalledWith(expect.objectContaining({ host: undefined }));
      expect(setSelectedHostSpy).toHaveBeenCalledWith(null);
    });
  });
});
