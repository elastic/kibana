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

// @ts-ignore
import fetchMock from 'fetch-mock/es5/client';
import { HttpFetchOptions } from './types';
import { abortable } from './abortable';

const Abortable = abortable((path: string, options?: HttpFetchOptions) => fetch('/', options));

describe('abortable', () => {
  afterEach(() => {
    fetchMock.restore();
  });

  it('should return an abortable promise', async () => {
    fetchMock.get('*', { status: 500 });

    const promise = Abortable('/resolved');

    expect(promise).toBeInstanceOf(Promise);

    promise.abort();

    try {
      await promise;
      throw new Error('Unexpected Resolution');
    } catch (err) {
      expect(err.message).not.toMatch(/Internal Server Error/);
      expect(err.message).not.toMatch(/Unexpected Resolution/);
    }
  });
});
