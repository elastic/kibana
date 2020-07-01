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

import { Client } from '@elastic/elasticsearch';
import { getClientFacade } from './get_client_facade';

// note this is only a partial version of the Client API
// as the facade is generated from our script, we can assume it is safe to
// only test behavior from arbitrary picked methods
// it also avoid to generate yet another file with a
// fully mocked `Client` interface
const getClientMock = (): DeeplyMockedKeys<Client> => {
  return {
    transport: {
      request: jest.fn(),
    },
    search: jest.fn(),
  } as any;
};

describe('getClientFacade', () => {
  let client: DeeplyMockedKeys<Client>;

  beforeEach(() => {
    client = getClientMock();
  });

  it('calls the client with correct parameters', () => {
    const facade = getClientFacade(client, {});

    facade.search({ from: 12, preference: 'pref' }, { maxRetries: 42 });

    expect(client.search).toHaveBeenCalledTimes(1);
    expect(client.search).toHaveBeenCalledWith(
      { from: 12, preference: 'pref' },
      { maxRetries: 42, headers: {} }
    );
  });

  it('adds the facade headers to the `options.headers`', () => {
    const facade = getClientFacade(client, { foo: 'bar', authorization: 'go' });

    facade.search({});

    expect(client.search).toHaveBeenCalledWith(expect.any(Object), {
      headers: { foo: 'bar', authorization: 'go' },
    });
  });

  it('respects the caller headers precedence', () => {
    const facade = getClientFacade(client, { foo: 'facade', authorization: 'go' });

    facade.search(
      {},
      {
        headers: {
          foo: 'caller',
          bar: 'true',
        },
      }
    );

    expect(client.search).toHaveBeenCalledWith(expect.any(Object), {
      headers: {
        foo: 'caller',
        authorization: 'go',
        bar: 'true',
      },
    });
  });
});
