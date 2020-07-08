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

import { elasticsearchClientMock } from './mocks';

describe('Mocked client', () => {
  let client: ReturnType<typeof elasticsearchClientMock.createInternalClient>;

  const expectMocked = (fn: jest.MockedFunction<any> | undefined) => {
    expect(fn).toBeDefined();
    expect(fn.mockReturnValue).toEqual(expect.any(Function));
  };

  beforeEach(() => {
    client = elasticsearchClientMock.createInternalClient();
  });

  it('`transport.request` should be mocked', () => {
    expectMocked(client.transport.request);
  });

  it('root level API methods should be mocked', () => {
    expectMocked(client.bulk);
    expectMocked(client.search);
  });

  it('nested level API methods should be mocked', () => {
    expectMocked(client.asyncSearch.get);
    expectMocked(client.nodes.info);
  });

  it('`close` should be mocked', () => {
    expectMocked(client.close);
  });

  it('`child` should be mocked and return a mocked Client', () => {
    expectMocked(client.child);

    const child = client.child();

    expect(child).not.toBe(client);
    expectMocked(child.search);
  });
});
