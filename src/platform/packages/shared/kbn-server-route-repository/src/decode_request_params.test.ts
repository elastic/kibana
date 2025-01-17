/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';
import { decodeRequestParams } from './decode_request_params';

describe('decodeRequestParams', () => {
  it('decodes request params', () => {
    const decode = () => {
      return decodeRequestParams(
        {
          path: {
            serviceName: 'opbeans-java',
          },
          query: {
            start: '',
          },
        },
        t.type({
          path: t.type({
            serviceName: t.string,
          }),
          query: t.type({
            start: t.string,
          }),
        })
      );
    };
    expect(decode).not.toThrow();

    expect(decode()).toEqual({
      path: {
        serviceName: 'opbeans-java',
      },
      query: {
        start: '',
      },
    });
  });

  it('fails on excess keys', () => {
    const decode = () => {
      return decodeRequestParams(
        {
          path: {
            serviceName: 'opbeans-java',
            extraKey: '',
          },
          query: {
            start: '',
          },
        },
        t.type({
          path: t.type({
            serviceName: t.string,
          }),
          query: t.type({
            start: t.string,
          }),
        })
      );
    };

    expect(decode).toThrowErrorMatchingInlineSnapshot(`
      "Failed to validate: 
        Excess keys are not allowed:
      path.extraKey"
    `);
  });
});
