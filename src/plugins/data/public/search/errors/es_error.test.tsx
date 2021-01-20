/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { EsError } from './es_error';
import { IEsError } from './types';

describe('EsError', () => {
  it('contains the same body as the wrapped error', () => {
    const error = {
      body: {
        attributes: {
          error: {
            type: 'top_level_exception_type',
            reason: 'top-level reason',
          },
        },
      },
    } as IEsError;
    const esError = new EsError(error);

    expect(typeof esError.body).toEqual('object');
    expect(esError.body).toEqual(error.body);
  });
});
