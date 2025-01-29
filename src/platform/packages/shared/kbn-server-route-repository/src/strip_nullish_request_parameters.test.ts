/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { stripNullishRequestParameters } from './strip_nullish_request_parameters';

describe('stripNullishRequestParameters', () => {
  it('translate params to path', () => {
    expect(
      stripNullishRequestParameters({
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
      stripNullishRequestParameters({
        params: undefined,
        query: null,
        body: {},
      })
    ).toEqual({});
  });
});
