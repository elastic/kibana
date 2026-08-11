/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getAutoIndentedRequests } from './auto_indent';

describe('auto_indent', () => {
  describe('getAutoIndentedRequests', () => {
    const mockAddToastWarning = jest.fn();
    const sampleEditorTextLines = [
      '                                    ', // line 1
      'GET    _search                      ', // line 2
      '{                                   ', // line 3
      '  "query":     {                    ', // line 4
      '    "match_all":    {      }        ', // line 5
      '    }                               ', // line 6
      '   }                                ', // line 7
      '                                    ', // line 8
      '// single comment before Request 2  ', // line 9
      '  GET  _all                         ', // line 10
      '                                    ', // line 11
      '/*                                  ', // line 12
      ' multi-line comment before Request 3', // line 13
      '*/                                  ', // line 14
      'POST   /_bulk                       ', // line 15
      '{                                   ', // line 16
      '       "index":{                    ', // line 17
      '          "_index":"books"          ', // line 18
      '     }                              ', // line 19
      ' }                                  ', // line 20
      '{                                   ', // line 21
      '"name":"1984"                       ', // line 22
      '}{"name":"Atomic habits"}           ', // line 23
      '                                    ', // line 24
      'GET    _search  // test comment     ', // line 25
      '{                                   ', // line 26
      '  "query":     {                    ', // line 27
      '    "match_all":    {   } // comment', // line 28
      '    }                               ', // line 29
      '}                                   ', // line 30
      ' // some comment                    ', // line 31
      '                                    ', // line 32
      'POST    _query                     ', // line 33
      '{                                   ', // line 34
      '  "query":     """', // line 35
      '    FROM sample_data', // line 36
      '    | WHERE message LIKE "Connected *"', // line 37
      '    | SORT @timestamp DESC', // line 38
      '  """                                 ', // line 39
      '}                                   ', // line 40
    ];

    const TEST_REQUEST_1 = {
      // Offsets are with respect to the sample editor text
      startLineNumber: 2,
      endLineNumber: 7,
      startOffset: 1,
      endOffset: 36,
    };

    const TEST_REQUEST_2 = {
      // Offsets are with respect to the sample editor text
      startLineNumber: 10,
      endLineNumber: 10,
      startOffset: 1,
      endOffset: 36,
    };

    const TEST_REQUEST_3 = {
      // Offsets are with respect to the sample editor text
      startLineNumber: 15,
      endLineNumber: 23,
      startOffset: 1,
      endOffset: 36,
    };

    const TEST_REQUEST_4 = {
      // Offsets are with respect to the sample editor text
      startLineNumber: 25,
      endLineNumber: 30,
      startOffset: 1,
      endOffset: 36,
    };

    const TEST_REQUEST_5 = {
      // Offsets are with respect to the sample editor text
      startLineNumber: 33,
      endLineNumber: 40,
      startOffset: 1,
      endOffset: 36,
    };

    afterEach(() => {
      mockAddToastWarning.mockClear();
    });

    it('correctly auto-indents a single request with data', () => {
      const formattedData = getAutoIndentedRequests(
        [TEST_REQUEST_1],
        sampleEditorTextLines
          .slice(TEST_REQUEST_1.startLineNumber - 1, TEST_REQUEST_1.endLineNumber)
          .join('\n'),
        sampleEditorTextLines.join('\n'),
        mockAddToastWarning
      );
      const expectedResultLines = [
        'GET _search',
        '{',
        '  "query": {',
        '    "match_all": {}',
        '  }',
        '}',
      ];

      expect(formattedData).toBe(expectedResultLines.join('\n'));
      expect(mockAddToastWarning).not.toHaveBeenCalled();
    });

    it('correctly auto-indents a single request with no data', () => {
      const formattedData = getAutoIndentedRequests(
        [TEST_REQUEST_2],
        sampleEditorTextLines
          .slice(TEST_REQUEST_2.startLineNumber - 1, TEST_REQUEST_2.endLineNumber)
          .join('\n'),
        sampleEditorTextLines.join('\n'),
        mockAddToastWarning
      );
      const expectedResult = 'GET _all';

      expect(formattedData).toBe(expectedResult);
      expect(mockAddToastWarning).not.toHaveBeenCalled();
    });

    it('correctly auto-indents a single request with multiple data', () => {
      const formattedData = getAutoIndentedRequests(
        [TEST_REQUEST_3],
        sampleEditorTextLines
          .slice(TEST_REQUEST_3.startLineNumber - 1, TEST_REQUEST_3.endLineNumber)
          .join('\n'),
        sampleEditorTextLines.join('\n'),
        mockAddToastWarning
      );
      const expectedResultLines = [
        'POST /_bulk',
        '{',
        '  "index": {',
        '    "_index": "books"',
        '  }',
        '}',
        '{',
        '  "name": "1984"',
        '}',
        '{',
        '  "name": "Atomic habits"',
        '}',
      ];

      expect(formattedData).toBe(expectedResultLines.join('\n'));
      expect(mockAddToastWarning).not.toHaveBeenCalled();
    });

    it('auto-indents multiple request with comments in between', () => {
      const formattedData = getAutoIndentedRequests(
        [TEST_REQUEST_1, TEST_REQUEST_2, TEST_REQUEST_3],
        sampleEditorTextLines.slice(1, 23).join('\n'),
        sampleEditorTextLines.join('\n'),
        mockAddToastWarning
      );
      const expectedResultLines = [
        'GET _search',
        '{',
        '  "query": {',
        '    "match_all": {}',
        '  }',
        '}',
        '',
        '// single comment before Request 2',
        'GET _all',
        '',
        '/*',
        'multi-line comment before Request 3',
        '*/',
        'POST /_bulk',
        '{',
        '  "index": {',
        '    "_index": "books"',
        '  }',
        '}',
        '{',
        '  "name": "1984"',
        '}',
        '{',
        '  "name": "Atomic habits"',
        '}',
      ];

      expect(formattedData).toBe(expectedResultLines.join('\n'));
      expect(mockAddToastWarning).not.toHaveBeenCalled();
    });

    it('SHOULD preserve following selected lines when a request expands during formatting', () => {
      const editorTextLines = [
        'GET _search',
        '{"query":{"match_all":{}}}',
        '',
        '// after the request',
      ];
      const formattedData = getAutoIndentedRequests(
        [
          {
            startLineNumber: 1,
            endLineNumber: 2,
            startOffset: 0,
            endOffset: 0,
          },
        ],
        editorTextLines.join('\n'),
        editorTextLines.join('\n'),
        mockAddToastWarning
      );

      expect(formattedData).toBe(
        [
          'GET _search',
          '{',
          '  "query": {',
          '    "match_all": {}',
          '  }',
          '}',
          '',
          '// after the request',
        ].join('\n')
      );
      expect(mockAddToastWarning).not.toHaveBeenCalled();
    });

    it(`auto-indents method line but doesn't auto-indent data with comments`, () => {
      const methodLine = sampleEditorTextLines[TEST_REQUEST_4.startLineNumber - 1];
      const dataText = sampleEditorTextLines
        .slice(TEST_REQUEST_4.startLineNumber, TEST_REQUEST_4.endLineNumber)
        .join('\n');
      const formattedData = getAutoIndentedRequests(
        [TEST_REQUEST_4],
        `${methodLine}\n${dataText}`,
        sampleEditorTextLines.join('\n'),
        mockAddToastWarning
      );

      expect(formattedData).toBe(`GET _search // test comment\n${dataText}`);
      expect(mockAddToastWarning).toHaveBeenCalledWith(
        expect.stringContaining(
          'Auto-indentation is currently not supported for requests containing comments. Please remove comments to enable formatting.'
        )
      );
      mockAddToastWarning.mockReset();
    });

    it('correctly auto-indents a single request that contains triple quotes', () => {
      const formattedData = getAutoIndentedRequests(
        [TEST_REQUEST_5],
        sampleEditorTextLines
          .slice(TEST_REQUEST_5.startLineNumber - 1, TEST_REQUEST_5.endLineNumber)
          .join('\n'),
        sampleEditorTextLines.join('\n'),
        mockAddToastWarning
      );
      const expectedResultLines = [
        'POST _query',
        '{',
        '  "query": """',
        '    FROM sample_data',
        '    | WHERE message LIKE "Connected *"',
        '    | SORT @timestamp DESC',
        '  """',
        '}',
      ];

      expect(formattedData).toBe(expectedResultLines.join('\n'));
      expect(mockAddToastWarning).not.toHaveBeenCalled();
    });
  });
});
