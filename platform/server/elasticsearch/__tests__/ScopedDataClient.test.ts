const mockCallAPI = jest.fn();

jest.mock('../call_api', () => ({
  callAPI: mockCallAPI,
}));

import { Client } from 'elasticsearch';
import { ElasticsearchConfig, ElasticsearchClusterType } from '../ElasticsearchConfig';
import * as clusterSchema from '../schema';
import { ScopedDataClient } from '../ScopedDataClient';

let client;
let esClient: Client;
let esConfig: ElasticsearchConfig;
let clusterType: ElasticsearchClusterType;

beforeEach(() => {
  esClient = new Client({});
  clusterType = 'data';
  esConfig = new ElasticsearchConfig(clusterType, clusterSchema);
  esConfig.requestHeadersWhitelist = ['authorization'];
  client = new ScopedDataClient({
    client: esClient,
    headers: { authorization: 'auth', foo: 'bar' },
    config: esConfig,
  });
});

describe('call passes correct arguments to callAPI', () => {
  test('when only endpoint is specified', () => {
    client.call('foo');
    expect(mockCallAPI).toHaveBeenCalledWith(esClient, 'foo', { headers: { authorization: 'auth' } }, {});
  });

  test('when endpoint and clientParams are specified', () => {
    client.call('foo', { bar: 'baz' });
    expect(mockCallAPI).toHaveBeenCalledWith(esClient, 'foo', { headers: { authorization: 'auth' }, bar: 'baz' }, {});
  });

  test('when endpoint, clientParams, and options are specified', () => {
    client.call('foo', {}, { wrap401Errors: true });
    expect(mockCallAPI).toHaveBeenCalledWith(esClient, 'foo', { headers: { authorization: 'auth' } }, { wrap401Errors: true });
  });

  test('when endpoint contains periods', () => {
    client.call('foo.bar.baz');
    expect(mockCallAPI).toHaveBeenCalledWith(esClient, 'foo.bar.baz', { headers: { authorization: 'auth' } }, {});
  });
});
