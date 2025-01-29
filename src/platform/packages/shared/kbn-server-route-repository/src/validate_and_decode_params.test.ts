/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KibanaRequest } from '@kbn/core-http-server';
import { z } from '@kbn/zod';
import * as t from 'io-ts';
import { validateAndDecodeParams } from './validate_and_decode_params';

describe('validateAndDecodeParams', () => {
  it('does nothing if no schema is provided', () => {
    const request = {} as KibanaRequest;
    expect(validateAndDecodeParams(request, undefined)).toEqual(undefined);
  });

  it('only does formatting when using zod', () => {
    const request = {
      params: {
        my_path_param: 'test',
      },
      query: {},
    } as KibanaRequest;

    expect(validateAndDecodeParams(request, z.object({}))).toEqual({
      path: {
        my_path_param: 'test',
      },
    });
  });

  it('additionally performs validation when using zod', () => {
    const schema = t.type({
      path: t.type({
        my_path_param: t.string,
      }),
    });

    const validRequest = {
      params: {
        my_path_param: 'test',
      },
      query: {},
    } as KibanaRequest;

    expect(validateAndDecodeParams(validRequest, schema)).toEqual({
      path: {
        my_path_param: 'test',
      },
    });

    const invalidRequest = {
      params: {
        my_unexpected_param: 'test',
      },
    } as KibanaRequest;
    const shouldThrow = () => {
      return validateAndDecodeParams(invalidRequest, schema);
    };

    expect(shouldThrow).toThrowErrorMatchingInlineSnapshot(`
      "Failed to validate: 
        in /path/my_path_param: undefined does not match expected type string"
    `);
  });
});
