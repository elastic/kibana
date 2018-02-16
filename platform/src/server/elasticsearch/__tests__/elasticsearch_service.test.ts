const mockCreateClient = jest.fn();

jest.mock('elasticsearch', () => ({
  Client: mockCreateClient,
}));

import { ElasticsearchService } from '../elasticsearch_service';
import { AdminClient } from '../admin_client';
import { ScopedDataClient } from '../scoped_data_client';
import { logger } from '../../../logging/__mocks__';
import { k$, BehaviorSubject, first, toPromise } from '@kbn/observable';

test('should not create multiple clients while service is running', async () => {
  const createElasticsearchConfig = (type: string) => ({
    filterHeaders: () => {},
    toElasticsearchClientConfig: (options: any) => ({ type, options }),
    requestHeadersWhitelist: [],
  });
  const elasticsearchConfigs = {
    forType: (type: string) => createElasticsearchConfig(type),
  };
  const configs$: any = new BehaviorSubject(elasticsearchConfigs);
  const service = new ElasticsearchService(configs$, logger);

  mockCreateClient.mockReset();

  // Start subscribing to this.clients$,
  // which means new elasticsearch data and admin clients are created,
  // calling mockCreateClient once for each client (twice)
  await service.start();

  // Get the latest elasticsearch data client
  // and create a ScopedDataClient around it
  await service.getScopedDataClient({ foo: 'bar' });
  // Calling it again does not create any new elasticsearch clients
  await service.getScopedDataClient({ foo: 'bar' });

  await service.stop();

  // We expect it to be called only twice: once for the data client
  // and once for the admin client.
  expect(mockCreateClient).toHaveBeenCalledTimes(2);

  // Check that specifically the admin client and the data client
  // were created
  expect(mockCreateClient.mock.calls).toMatchSnapshot();
});

test('should get an AdminClient', async () => {
  const elasticsearchConfigs = {
    forType: () => ({ toElasticsearchClientConfig: () => {} }),
  };

  const configs$: any = new BehaviorSubject(elasticsearchConfigs);

  const service = new ElasticsearchService(configs$, logger);
  const adminClient = await k$(service.getAdminClient$())(first(), toPromise());

  expect(adminClient).toBeInstanceOf(AdminClient);
});

test('should get a ScopedDataClient', async () => {
  const elasticsearchConfig = {
    filterHeaders: () => {},
    toElasticsearchClientConfig: () => {},
    requestHeadersWhitelist: [],
  };

  const elasticsearchConfigs = {
    forType: () => elasticsearchConfig,
  };

  const configs$: any = new BehaviorSubject(elasticsearchConfigs);

  const service = new ElasticsearchService(configs$, logger);
  const dataClient = await service.getScopedDataClient({ foo: 'bar' });

  expect(dataClient).toBeInstanceOf(ScopedDataClient);
});

test('should get a ScopedDataClient observable', async () => {
  const elasticsearchConfig = {
    filterHeaders: jest.fn(),
    toElasticsearchClientConfig: () => {},
    requestHeadersWhitelist: [],
  };

  const elasticsearchConfigs = {
    forType: () => elasticsearchConfig,
  };

  const configs$: any = new BehaviorSubject(elasticsearchConfigs);

  const service = new ElasticsearchService(configs$, logger);
  const dataClient$ = service.getScopedDataClient$({ foo: 'bar' });

  const dataClient = await k$(dataClient$)(first(), toPromise());

  expect(dataClient).toBeInstanceOf(ScopedDataClient);
  expect(elasticsearchConfig.filterHeaders).toHaveBeenCalledWith({
    foo: 'bar',
  });
});
