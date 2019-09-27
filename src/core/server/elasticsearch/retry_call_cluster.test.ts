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
import elasticsearch from 'elasticsearch';
import { retryCallCluster } from './retry_call_cluster';

describe('retryCallCluster', () => {
  it('retries ES API calls that rejects with NoConnection errors', () => {
    expect.assertions(1);
    const callEsApi = jest.fn();
    let i = 0;
    callEsApi.mockImplementation(() => {
      return i++ <= 2
        ? Promise.reject(new elasticsearch.errors.NoConnections())
        : Promise.resolve('success');
    });
    const retried = retryCallCluster(callEsApi);
    return expect(retried('endpoint')).resolves.toMatchInlineSnapshot(`"success"`);
  });

  it('rejects when ES API calls reject with other errors', async () => {
    expect.assertions(3);
    const callEsApi = jest.fn();
    let i = 0;
    callEsApi.mockImplementation(() => {
      i++;

      return i === 1
        ? Promise.reject(new Error('unknown error'))
        : i === 2
        ? Promise.resolve('success')
        : i === 3 || i === 4
        ? Promise.reject(new elasticsearch.errors.NoConnections())
        : i === 5
        ? Promise.reject(new Error('unknown error'))
        : null;
    });
    const retried = retryCallCluster(callEsApi);
    await expect(retried('endpoint')).rejects.toMatchInlineSnapshot(`[Error: unknown error]`);
    await expect(retried('endpoint')).resolves.toMatchInlineSnapshot(`"success"`);
    return expect(retried('endpoint')).rejects.toMatchInlineSnapshot(`[Error: unknown error]`);
  });
});
