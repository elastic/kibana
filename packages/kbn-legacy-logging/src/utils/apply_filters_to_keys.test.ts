/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { applyFiltersToKeys } from './apply_filters_to_keys';

describe('applyFiltersToKeys(obj, actionsByKey)', function () {
  it('applies for each key+prop in actionsByKey', function () {
    const data = applyFiltersToKeys(
      {
        a: {
          b: {
            c: 1,
          },
          d: {
            e: 'foobar',
          },
        },
        req: {
          headers: {
            authorization: 'Basic dskd939k2i',
          },
        },
      },
      {
        b: 'remove',
        e: 'censor',
        authorization: '/([^\\s]+)$/',
      }
    );

    expect(data).toEqual({
      a: {
        d: {
          e: 'XXXXXX',
        },
      },
      req: {
        headers: {
          authorization: 'Basic XXXXXXXXXX',
        },
      },
    });
  });
});
