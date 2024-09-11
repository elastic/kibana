/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getStatusCodeDecorations } from './status_code_decoration_utils';
import {
  SUCCESS_STATUS_BADGE_CLASSNAME,
  WARNING_STATUS_BADGE_CLASSNAME,
  DANGER_STATUS_BADGE_CLASSNAME,
} from './constants';
import { RequestResult } from '../../../../hooks/use_send_current_request/send_request';

describe('getStatusCodeDecorations', () => {
  it('correctly returns all decorations on full data', () => {
    // Sample multiple-response data returned from ES:
    // 1  # GET _search 200 OK
    // 2  {
    // 3    "took": 1,
    // 4    "timed_out": false,
    // 5    "hits": {
    // 6      "total": {
    // 7        "value": 0,
    // 8        "relation": "eq"
    // 9      }
    // 10   }
    // 11 }
    // 12 # GET _test 400 Bad Request
    // 13 {
    // 14   "error": {
    // 15   "root_cause": [],
    // 16   "status": 400
    // 17 }
    // 18 # PUT /library/_bulk 500 Internal Server Error
    // 19 {
    // 20   "error": {
    // 21   "root_cause": [],
    // 22   "status": 500
    // 23 }
    const SAMPLE_COMPLETE_DATA: RequestResult[] = [
      {
        response: {
          timeMs: 50,
          statusCode: 200,
          statusText: 'OK',
          contentType: 'application/json',
          value:
            '# GET _search 200 OK\n{\n"took": 1,\n"timed_out": false,\n"hits": {\n"total": {\n"value": 0,\n"relation": "eq"\n}\n}\n}',
        },
        request: {
          data: '',
          method: 'GET',
          path: '_search',
        },
      },
      {
        response: {
          timeMs: 22,
          statusCode: 400,
          statusText: 'Bad Request',
          contentType: 'application/json',
          value: '# GET _test 400 Bad Request\n{\n"error": {\n"root_cause": [],\n"status": 400\n}',
        },
        request: {
          data: '',
          method: 'GET',
          path: '_test',
        },
      },
      {
        response: {
          timeMs: 23,
          statusCode: 500,
          statusText: 'Internal Server Error',
          contentType: 'application/json',
          value:
            '# PUT /library/_bulk 500 Internal Server Error\n{\n"error": {\n"root_cause": [],\n"status": 500\n}',
        },
        request: {
          data: '',
          method: 'PUT',
          path: '/library/_bulk?refresh',
        },
      },
    ];

    const EXPECTED_DECORATIONS = [
      {
        range: {
          endColumn: 21,
          endLineNumber: 1,
          startColumn: 15,
          startLineNumber: 1,
        },
        options: {
          inlineClassName: SUCCESS_STATUS_BADGE_CLASSNAME,
        },
      },
      {
        range: {
          endColumn: 28,
          endLineNumber: 12,
          startColumn: 13,
          startLineNumber: 12,
        },
        options: {
          inlineClassName: WARNING_STATUS_BADGE_CLASSNAME,
        },
      },
      {
        range: {
          endColumn: 47,
          endLineNumber: 18,
          startColumn: 22,
          startLineNumber: 18,
        },
        options: {
          inlineClassName: DANGER_STATUS_BADGE_CLASSNAME,
        },
      },
    ];

    expect(getStatusCodeDecorations(SAMPLE_COMPLETE_DATA)).toEqual(EXPECTED_DECORATIONS);
  });

  it('only returns decorations for data with complete status code and text', () => {
    // This sample data is same as in previous test but some of it has incomplete status code or status text
    const SAMPLE_INCOMPLETE_DATA: RequestResult[] = [
      {
        response: {
          timeMs: 50,
          // @ts-ignore
          statusCode: undefined,
          statusText: 'OK',
          contentType: 'application/json',
          value:
            '# GET _search OK\n{\n"took": 1,\n"timed_out": false,\n"hits": {\n"total": {\n"value": 0,\n"relation": "eq"\n}\n}\n}',
        },
        request: {
          data: '',
          method: 'GET',
          path: '_search',
        },
      },
      {
        response: {
          timeMs: 22,
          statusCode: 400,
          statusText: 'Bad Request',
          contentType: 'application/json',
          value: '# GET _test 400 Bad Request\n{\n"error": {\n"root_cause": [],\n"status": 400\n}',
        },
        request: {
          data: '',
          method: 'GET',
          path: '_test',
        },
      },
      {
        response: {
          timeMs: 23,
          // @ts-ignore
          statusCode: undefined,
          // @ts-ignore
          statusText: undefined,
          contentType: 'application/json',
          value: '# PUT /library/_bulk\n{\n"error": {\n"root_cause": [],\n"status": 500\n}',
        },
        request: {
          data: '',
          method: 'PUT',
          path: '/library/_bulk?refresh',
        },
      },
    ];

    // Only the second response has complete status code and text
    const EXPECTED_DECORATIONS = [
      {
        range: {
          endColumn: 28,
          endLineNumber: 12,
          startColumn: 13,
          startLineNumber: 12,
        },
        options: {
          inlineClassName: WARNING_STATUS_BADGE_CLASSNAME,
        },
      },
    ];

    expect(getStatusCodeDecorations(SAMPLE_INCOMPLETE_DATA)).toEqual(EXPECTED_DECORATIONS);
  });
});
