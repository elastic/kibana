const mockCallAPI = jest.fn();

jest.mock('../call_api', () => ({
  callAPI: mockCallAPI,
}));

import { Client } from 'elasticsearch';
import { ScopedDataClient } from '../scoped_data_client';

let client: ScopedDataClient;
let esClient: Client;

beforeEach(() => {
  esClient = new Client({});
  client = new ScopedDataClient(esClient, { foo: 'bar' });
});

describe('call passes correct arguments to callAPI', () => {
  test('when only endpoint is specified', () => {
    client.call('foo');
    expect(mockCallAPI).toHaveBeenCalledWith(
      esClient,
      'foo',
      { headers: { foo: 'bar' } },
      { wrap401Errors: true }
    );
  });

  test('when endpoint and clientParams are specified', () => {
    client.call('foo', { bar: 'baz' });
    expect(mockCallAPI).toHaveBeenCalledWith(
      esClient,
      'foo',
      { headers: { foo: 'bar' }, bar: 'baz' },
      { wrap401Errors: true }
    );
  });

  test('when endpoint, clientParams, and options are specified', () => {
    client.call('foo', {}, { wrap401Errors: true });
    expect(mockCallAPI).toHaveBeenCalledWith(
      esClient,
      'foo',
      { headers: { foo: 'bar' } },
      { wrap401Errors: true }
    );
  });

  test('when endpoint contains periods', () => {
    client.call('foo.bar.baz');
    expect(mockCallAPI).toHaveBeenCalledWith(
      esClient,
      'foo.bar.baz',
      { headers: { foo: 'bar' } },
      { wrap401Errors: true }
    );
  });
});
