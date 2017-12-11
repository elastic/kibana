const mockCreateClient = jest.fn();

jest.mock('elasticsearch', () => ({
  Client: mockCreateClient,
}));

import { ElasticsearchService } from '../ElasticsearchService';
import { AdminClient } from '../AdminClient';
import { ScopedDataClient } from '../ScopedDataClient';
import { logger } from '../../../logging/__mocks__';
import {
  k$,
  BehaviorSubject,
  first,
  toPromise,
} from '@elastic/kbn-observable';

test('should not create multiple clients', async () => {
  const forTypeContents = {
    toElasticsearchClientConfig: () => {},
    requestHeadersWhitelist: [],
  };

  const elasticsearchConfigs = {
    forType: () => forTypeContents,
  };

  const configs$: any = new BehaviorSubject(elasticsearchConfigs);

  const service = new ElasticsearchService(configs$, logger);

  mockCreateClient.mockReset();

  service.start();

  await service.getScopedDataClient({ foo: 'bar' });
  await service.getScopedDataClient({ foo: 'bar' });

  service.stop();

  expect(mockCreateClient).toHaveBeenCalledTimes(2);
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
  const forTypeContents = {
    toElasticsearchClientConfig: () => {},
    requestHeadersWhitelist: [],
  };

  const elasticsearchConfigs = {
    forType: () => forTypeContents,
  };

  const configs$: any = new BehaviorSubject(elasticsearchConfigs);

  const service = new ElasticsearchService(configs$, logger);
  const dataClient = await service.getScopedDataClient({ foo: 'bar' });

  expect(dataClient).toBeInstanceOf(ScopedDataClient);
});

test('should get a ScopedDataClient observable', async () => {
  const forTypeContents = {
    toElasticsearchClientConfig: () => {},
    requestHeadersWhitelist: [],
  };

  const elasticsearchConfigs = {
    forType: () => forTypeContents,
  };

  const configs$: any = new BehaviorSubject(elasticsearchConfigs);

  const service = new ElasticsearchService(configs$, logger);
  const dataClient$ = service.getScopedDataClient$({ foo: 'bar' });

  expect(await k$(dataClient$)(first(), toPromise())).toBeInstanceOf(ScopedDataClient);
});
