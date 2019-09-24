/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { schema } from '@kbn/config-schema';

import { KibanaRequest } from './request';
import { httpServerMock } from '../http_server.mocks';

describe('KibanaRequest', () => {
  describe('get all headers', () => {
    it('returns all headers', () => {
      const request = httpServerMock.createRawRequest({
        headers: { custom: 'one', authorization: 'token' },
      });
      const kibanaRequest = KibanaRequest.from(request);
      expect(kibanaRequest.headers).toEqual({ custom: 'one', authorization: 'token' });
    });
  });

  describe('headers property', () => {
    it('provides a frozen copy of request headers', () => {
      const rawRequestHeaders = { custom: 'one' };
      const request = httpServerMock.createRawRequest({
        headers: rawRequestHeaders,
      });
      const kibanaRequest = KibanaRequest.from(request);

      expect(kibanaRequest.headers).toEqual({ custom: 'one' });
      expect(kibanaRequest.headers).not.toBe(rawRequestHeaders);
      expect(Object.isFrozen(kibanaRequest.headers)).toBe(true);
    });

    it.skip("doesn't expose authorization header by default", () => {
      const request = httpServerMock.createRawRequest({
        headers: { custom: 'one', authorization: 'token' },
      });
      const kibanaRequest = KibanaRequest.from(request);
      expect(kibanaRequest.headers).toEqual({
        custom: 'one',
      });
    });

    it('exposes authorization header if secured = false', () => {
      const request = httpServerMock.createRawRequest({
        headers: { custom: 'one', authorization: 'token' },
      });
      const kibanaRequest = KibanaRequest.from(request, undefined, false);
      expect(kibanaRequest.headers).toEqual({
        custom: 'one',
        authorization: 'token',
      });
    });
  });

  describe('validation', () => {
    describe('body', () => {
      it('passes with optional fields object with empty object payload', () => {
        expect(
          KibanaRequest.from(httpServerMock.createRawRequest({ payload: {} }), {
            body: schema.object({ field1: schema.maybe(schema.string()) }),
          }).body
        ).toEqual({});
      });

      it('passes with optional object body and null payload', () => {
        expect(
          KibanaRequest.from(httpServerMock.createRawRequest({ payload: null as any }), {
            body: schema.maybe(schema.object({})),
          }).body
        ).toBeUndefined();
      });

      it('passes with optional string body and null payload', () => {
        expect(
          KibanaRequest.from(httpServerMock.createRawRequest({ payload: null as any }), {
            body: schema.maybe(schema.string()),
          }).body
        ).toBeUndefined();
      });

      it('fails with string body and null payload', () => {
        expect(() => {
          KibanaRequest.from(httpServerMock.createRawRequest({ payload: null as any }), {
            body: schema.string(),
          });
        }).toThrowErrorMatchingInlineSnapshot(
          `"[request body]: expected value of type [string] but got [undefined]"`
        );
      });

      it('fails with optional fields object and null payload', () => {
        expect(() => {
          KibanaRequest.from(httpServerMock.createRawRequest({ payload: null as any }), {
            body: schema.object({ field1: schema.maybe(schema.string()) }),
          });
        }).toThrowErrorMatchingInlineSnapshot(
          `"[request body]: expected a plain object value, but found [undefined] instead."`
        );
      });
    });

    describe('query', () => {
      it('passes with required field and populated query', () => {
        expect(
          KibanaRequest.from(
            httpServerMock.createRawRequest({
              query: { field1: 'here' },
            }),
            {
              query: schema.object({ field1: schema.string() }),
            }
          ).query
        ).toEqual({ field1: 'here' });
      });

      it('passes with defaultValue field and empty query', () => {
        expect(
          KibanaRequest.from(
            httpServerMock.createRawRequest({
              query: {},
            }),
            {
              query: schema.object({ field1: schema.string({ defaultValue: 'default!' }) }),
            }
          ).query
        ).toEqual({ field1: 'default!' });
      });

      it('passes with optional field and empty query', () => {
        expect(
          KibanaRequest.from(
            httpServerMock.createRawRequest({
              query: {},
            }),
            {
              query: schema.object({ field1: schema.maybe(schema.string()) }),
            }
          ).query
        ).toEqual({});
      });

      it('fails with required field and empty query', () => {
        expect(() =>
          KibanaRequest.from(
            httpServerMock.createRawRequest({
              query: {},
            }),
            {
              query: schema.object({ field1: schema.string() }),
            }
          )
        ).toThrowErrorMatchingInlineSnapshot(
          `"[request query.field1]: expected value of type [string] but got [undefined]"`
        );
      });
    });

    describe('params', () => {
      it('passes with required field and populated params', () => {
        expect(
          KibanaRequest.from(
            httpServerMock.createRawRequest({
              params: { field1: 'here' },
            }),
            {
              params: schema.object({ field1: schema.string() }),
            }
          ).params
        ).toEqual({ field1: 'here' });
      });

      it('passes with defaultValue field and empty params', () => {
        expect(
          KibanaRequest.from(
            httpServerMock.createRawRequest({
              params: {},
            }),
            {
              params: schema.object({ field1: schema.string({ defaultValue: 'default!' }) }),
            }
          ).params
        ).toEqual({ field1: 'default!' });
      });

      it('passes with optional field and empty params', () => {
        expect(
          KibanaRequest.from(
            httpServerMock.createRawRequest({
              params: {},
            }),
            {
              params: schema.object({ field1: schema.maybe(schema.string()) }),
            }
          ).params
        ).toEqual({});
      });

      it('fails with required field and empty params', () => {
        expect(() =>
          KibanaRequest.from(
            httpServerMock.createRawRequest({
              params: {},
            }),
            {
              params: schema.object({ field1: schema.string() }),
            }
          )
        ).toThrowErrorMatchingInlineSnapshot(
          `"[request params.field1]: expected value of type [string] but got [undefined]"`
        );
      });
    });
  });
});
