/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { jsonRt } from '@kbn/io-ts-utils';
import * as t from 'io-ts';
import { decodeRequestParams } from './decode_request_params';

describe('decodeRequestParams', () => {
  it('decodes request params', () => {
    const decode = () => {
      return decodeRequestParams(
        {
          params: {
            serviceName: 'opbeans-java',
          },
          body: null,
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
          params: {
            serviceName: 'opbeans-java',
            extraKey: '',
          },
          body: null,
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
      "Excess keys are not allowed:
      path.extraKey"
    `);
  });

  it('returns the decoded output', () => {
    const decode = () => {
      return decodeRequestParams(
        {
          params: {},
          query: {
            _inspect: 'true',
          },
          body: null,
        },
        t.type({
          query: t.type({
            _inspect: jsonRt.pipe(t.boolean),
          }),
        })
      );
    };

    expect(decode).not.toThrow();

    expect(decode()).toEqual({
      query: {
        _inspect: true,
      },
    });
  });

  it('strips empty params', () => {
    const decode = () => {
      return decodeRequestParams(
        {
          params: {},
          query: {},
          body: {},
        },
        t.type({
          body: t.any,
        })
      );
    };

    expect(decode).not.toThrow();

    expect(decode()).toEqual({});
  });
});
