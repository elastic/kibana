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

const mockCallAPI = jest.fn();

jest.mock('../call_api', () => ({
  callAPI: mockCallAPI,
}));

import { Client } from 'elasticsearch';
import { AdminClient } from '../admin_client';

let client: AdminClient;
let esClient: Client;

beforeEach(() => {
  esClient = new Client({});
  client = new AdminClient(esClient);
});

describe('call passes correct arguments to callAPI', () => {
  test('when only endpoint is specified', () => {
    client.call('foo');
    expect(mockCallAPI).toHaveBeenCalledWith(
      esClient,
      'foo',
      {},
      { wrap401Errors: true }
    );
  });

  test('when endpoint and clientParams are specified', () => {
    client.call('foo', { bar: 'baz' });
    expect(mockCallAPI).toHaveBeenCalledWith(
      esClient,
      'foo',
      { bar: 'baz' },
      { wrap401Errors: true }
    );
  });

  test('when endpoint, clientParams, and options are specified', () => {
    client.call('foo', {}, { wrap401Errors: true });
    expect(mockCallAPI).toHaveBeenCalledWith(
      esClient,
      'foo',
      {},
      { wrap401Errors: true }
    );
  });

  test('when endpoint contains periods', () => {
    client.call('foo.bar.baz');
    expect(mockCallAPI).toHaveBeenCalledWith(
      esClient,
      'foo.bar.baz',
      {},
      { wrap401Errors: true }
    );
  });
});
