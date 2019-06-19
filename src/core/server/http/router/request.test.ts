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

  describe('#getFilteredHeaders', () => {
    it('returns request headers', () => {
      const request = httpServerMock.createRawRequest({
        headers: { custom: 'one' },
      });
      const kibanaRequest = KibanaRequest.from(request);
      expect(kibanaRequest.getFilteredHeaders(['custom'])).toEqual({
        custom: 'one',
      });
    });

    it('normalizes a header name', () => {
      const request = httpServerMock.createRawRequest({
        headers: { custom: 'one' },
      });
      const kibanaRequest = KibanaRequest.from(request);
      expect(kibanaRequest.getFilteredHeaders(['CUSTOM'])).toEqual({
        custom: 'one',
      });
    });

    it('returns an empty object is no headers were specified', () => {
      const request = httpServerMock.createRawRequest({
        headers: { custom: 'one' },
      });
      const kibanaRequest = KibanaRequest.from(request);
      expect(kibanaRequest.getFilteredHeaders([])).toEqual({});
    });

    it("doesn't expose authorization header by default", () => {
      const request = httpServerMock.createRawRequest({
        headers: { custom: 'one', authorization: 'token' },
      });
      const kibanaRequest = KibanaRequest.from(request);
      expect(kibanaRequest.getFilteredHeaders(['custom', 'authorization'])).toEqual({
        custom: 'one',
      });
    });

    it('exposes authorization header if secured = false', () => {
      const request = httpServerMock.createRawRequest({
        headers: { custom: 'one', authorization: 'token' },
      });
      const kibanaRequest = KibanaRequest.from(request, undefined, false);
      expect(kibanaRequest.getFilteredHeaders(['custom', 'authorization'])).toEqual({
        custom: 'one',
        authorization: 'token',
      });
    });
  });
});
