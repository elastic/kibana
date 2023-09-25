/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { moveRequestParamsToTopLevel } from './move_request_params_to_top_level';
import { RequestStatus } from './types';

describe('moveRequestParamsToTopLevel', () => {
  test('should move request meta from error response', () => {
    expect(
      moveRequestParamsToTopLevel(RequestStatus.ERROR, {
        json: {
          attributes: {},
          err: {
            message: 'simulated error',
            requestParams: {
              method: 'POST',
              path: '/_query',
            },
          },
        },
        time: 1,
      })
    ).toEqual({
      json: {
        attributes: {},
        err: {
          message: 'simulated error',
        },
      },
      requestParams: {
        method: 'POST',
        path: '/_query',
      },
      time: 1,
    });
  });

  test('should move request meta from ok response', () => {
    expect(
      moveRequestParamsToTopLevel(RequestStatus.OK, {
        json: {
          rawResponse: {},
          requestParams: {
            method: 'POST',
            path: '/_query',
          },
        },
        time: 1,
      })
    ).toEqual({
      json: {
        rawResponse: {},
      },
      requestParams: {
        method: 'POST',
        path: '/_query',
      },
      time: 1,
    });
  });
});
