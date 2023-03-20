/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import {
  createTestServers,
  type TestElasticsearchUtils,
  type TestKibanaUtils,
} from '@kbn/core-test-helpers-kbn-server';
import { EsEventStreamClient } from '../es_event_stream_client';
import { EventStreamLoggerMock } from '../../tests/event_stream_logger_mock';
import { testEventStreamClient } from '../../tests/test_event_stream_client';

describe('EsEventStreamClient', () => {
  let manageES: TestElasticsearchUtils;
  let manageKbn: TestKibanaUtils;
  let esClient: ElasticsearchClient;
  let resolveClient: (client: EsEventStreamClient) => void = () => {};
  const client: Promise<EsEventStreamClient> = new Promise((resolve) => {
    resolveClient = resolve;
  });

  const baseName = '.kibana-test';
  const indexTemplateName = `${baseName}-event-stream-template`;

  beforeAll(async () => {
    const { startES, startKibana } = createTestServers({ adjustTimeout: jest.setTimeout });

    manageES = await startES();
    manageKbn = await startKibana();
    esClient = manageKbn.coreStart.elasticsearch.client.asInternalUser;
    resolveClient(
      new EsEventStreamClient({
        baseName,
        esClient: Promise.resolve(esClient),
        kibanaVersion: '1.2.3',
        logger: new EventStreamLoggerMock(),
      })
    );
  });

  afterAll(async () => {
    await manageKbn.root.shutdown();
    await manageKbn.stop();
    await manageES.stop();
  });

  it('can initialize the Event Stream', async () => {
    const exists1 = await esClient.indices.existsIndexTemplate({
      name: indexTemplateName,
    });

    expect(exists1).toBe(false);

    await (await client).initialize();

    const exists2 = await esClient.indices.existsIndexTemplate({
      name: indexTemplateName,
    });

    expect(exists2).toBe(true);
  });

  testEventStreamClient(client);
});
