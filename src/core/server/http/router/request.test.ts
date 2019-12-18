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
import { KibanaRequest } from './request';
import { httpServerMock } from '../http_server.mocks';
import { schema } from '@kbn/config-schema';

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

  describe('RouteSchema type inferring', () => {
    it('should work with config-schema', () => {
      const body = Buffer.from('body!');
      const request = {
        ...httpServerMock.createRawRequest({
          params: { id: 'params' },
          query: { search: 'query' },
        }),
        payload: body, // Set outside because the mock is using `merge` by lodash and breaks the Buffer into arrays
      } as any;
      const kibanaRequest = KibanaRequest.from(request, {
        params: schema.object({ id: schema.string() }),
        query: schema.object({ search: schema.string() }),
        body: schema.buffer(),
      });
      expect(kibanaRequest.params).toStrictEqual({ id: 'params' });
      expect(kibanaRequest.params.id.toUpperCase()).toEqual('PARAMS'); // infers it's a string
      expect(kibanaRequest.query).toStrictEqual({ search: 'query' });
      expect(kibanaRequest.query.search.toUpperCase()).toEqual('QUERY'); // infers it's a string
      expect(kibanaRequest.body).toEqual(body);
      expect(kibanaRequest.body.byteLength).toBeGreaterThan(0); // infers it's a buffer
    });

    it('should work with ValidationFunction', () => {
      const body = Buffer.from('body!');
      const request = {
        ...httpServerMock.createRawRequest({
          params: { id: 'params' },
          query: { search: 'query' },
        }),
        payload: body, // Set outside because the mock is using `merge` by lodash and breaks the Buffer into arrays
      } as any;
      const kibanaRequest = KibanaRequest.from(request, {
        params: schema.object({ id: schema.string() }),
        query: schema.object({ search: schema.string() }),
        body: ({ ok, fail }, data) => {
          if (Buffer.isBuffer(data)) {
            return ok(data);
          } else {
            return fail('It should be a Buffer', []);
          }
        },
      });
      expect(kibanaRequest.params).toStrictEqual({ id: 'params' });
      expect(kibanaRequest.params.id.toUpperCase()).toEqual('PARAMS'); // infers it's a string
      expect(kibanaRequest.query).toStrictEqual({ search: 'query' });
      expect(kibanaRequest.query.search.toUpperCase()).toEqual('QUERY'); // infers it's a string
      expect(kibanaRequest.body).toEqual(body);
      expect(kibanaRequest.body.byteLength).toBeGreaterThan(0); // infers it's a buffer
    });
  });
});
