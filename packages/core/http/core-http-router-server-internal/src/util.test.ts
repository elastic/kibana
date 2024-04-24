/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { VersionedRouteValidation } from '@kbn/core-http-server';
import { prepareResponseValidation } from './util';

describe('prepareResponseValidation', () => {
  it('wraps only expected values on "once"', () => {
    const validation: VersionedRouteValidation<unknown, unknown, unknown> = {
      request: {},
      response: {
        200: {
          body: jest.fn(() => schema.string()),
        },
        404: {
          body: jest.fn(() => schema.string()),
        },
        unsafe: {
          body: true,
        },
      },
    };

    const prepared = prepareResponseValidation(validation.response!);

    expect(prepared).toEqual({
      200: { body: expect.any(Function) },
      404: { body: expect.any(Function) },
      unsafe: { body: true },
    });

    [1, 2, 3].forEach(() => prepared[200].body());
    [1, 2, 3].forEach(() => prepared[404].body());

    expect(validation.response![200].body).toHaveBeenCalledTimes(1);
    expect(validation.response![404].body).toHaveBeenCalledTimes(1);
  });
});
