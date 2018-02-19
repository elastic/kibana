import { ElasticsearchConfig } from '../elasticsearch_config';
import { ClusterSchema } from '../schema';

test('filters headers', () => {
  const clusterSchema = {} as ClusterSchema;
  const headers = { foo: 'bar', baz: 'qux' };
  const config = new ElasticsearchConfig('data', clusterSchema);
  config.requestHeadersWhitelist = ['foo'];

  const expectedHeaders = { foo: 'bar' };
  expect(config.filterHeaders(headers)).toEqual(expectedHeaders);
});

describe('creates elasticsearch client config', () => {
  test('when shouldAuth is true by default (for data clients)', () => {
    const clusterSchema = {
      pingTimeout: { asMilliseconds: () => {} },
      requestTimeout: { asMilliseconds: () => {} },
      url: '',
      username: 'foo',
      password: 'bar',
    } as ClusterSchema;
    const config = new ElasticsearchConfig('data', clusterSchema);

    expect(config.toElasticsearchClientConfig()).toMatchSnapshot();
  });

  test('when shouldAuth is false (for admin clients)', () => {
    const clusterSchema = {
      pingTimeout: { asMilliseconds: () => {} },
      requestTimeout: { asMilliseconds: () => {} },
      url: '',
    } as ClusterSchema;
    const config = new ElasticsearchConfig('data', clusterSchema);

    expect(
      config.toElasticsearchClientConfig({ shouldAuth: false })
    ).toMatchSnapshot();
  });
});
