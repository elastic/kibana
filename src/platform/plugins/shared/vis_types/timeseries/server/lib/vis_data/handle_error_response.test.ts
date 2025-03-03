/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Panel } from '../../../common/types';
import { handleErrorResponse, ErrorResponse } from './handle_error_response';

describe('handleErrorResponse', () => {
  const handleError = handleErrorResponse({
    id: 'test_panel',
  } as unknown as Panel);

  test('should only handle errors that contain errBody', () => {
    expect(handleError(new Error('Test Error'))).toMatchInlineSnapshot(`Object {}`);

    expect(handleError({ errBody: 'test' } as ErrorResponse)).toMatchInlineSnapshot(`
      Object {
        "test_panel": Object {
          "error": "test",
          "id": "test_panel",
          "series": Array [],
        },
      }
    `);
  });

  test('should set as error the last value of caused_by', () => {
    expect(
      handleError({
        errBody: {
          error: {
            reason: 'wrong 0',
            caused_by: {
              reason: 'wrong 1',
              caused_by: {
                caused_by: 'ok',
              },
            },
          },
        },
      } as ErrorResponse)
    ).toMatchInlineSnapshot(`
      Object {
        "test_panel": Object {
          "error": "ok",
          "id": "test_panel",
          "series": Array [],
        },
      }
    `);
  });

  test('should use the previous error message if the actual value is empty', () => {
    expect(
      handleError({
        errBody: {
          error: {
            reason: 'ok',
            caused_by: {
              reason: '',
            },
          },
        },
      } as ErrorResponse)
    ).toMatchInlineSnapshot(`
      Object {
        "test_panel": Object {
          "error": "ok",
          "id": "test_panel",
          "series": Array [],
        },
      }
    `);
  });

  test('shouldn not return empty error message', () => {
    expect(
      handleError({
        errBody: {
          error: {
            reason: '',
          },
        },
      } as ErrorResponse)
    ).toMatchInlineSnapshot(`
      Object {
        "test_panel": Object {
          "error": "Unexpected error",
          "id": "test_panel",
          "series": Array [],
        },
      }
    `);
  });
});
