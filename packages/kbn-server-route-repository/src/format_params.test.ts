/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { formatParams } from './format_params';

describe('formatParams', () => {
  it('translate params to path', () => {
    expect(
      formatParams({
        params: {
          something: 'test',
        },
      })
    ).toEqual({
      path: {
        something: 'test',
      },
    });
  });

  it('removes invalid values', () => {
    expect(
      formatParams({
        params: undefined,
        query: null,
        body: {},
      })
    ).toEqual({});
  });
});
