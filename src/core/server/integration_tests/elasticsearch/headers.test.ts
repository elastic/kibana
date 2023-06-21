/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as http from 'http';
import { Client } from '@elastic/elasticsearch';
import { esTestConfig } from '@kbn/test';
import { loggerMock } from '@kbn/logging-mocks';
import { configSchema, ElasticsearchConfig } from '@kbn/core-elasticsearch-server-internal';
import {
  configureClient,
  AgentManager,
  PRODUCT_RESPONSE_HEADER,
} from '@kbn/core-elasticsearch-client-server-internal';

describe('Elasticsearch client headers', () => {
  let esServer: http.Server;
  let client: Client;
  let requests: http.IncomingMessage[];

  function createFakeElasticsearchServer() {
    const server = http.createServer((req, res) => {
      requests.push(req);
      res.writeHead(200, {
        [PRODUCT_RESPONSE_HEADER]: 'Elasticsearch',
        'Content-Type': 'text/json',
      });
      res.write('{}');
      res.end();
    });
    server.listen(esTestConfig.getPort());

    return server;
  }

  beforeEach(async () => {
    requests = [];
    esServer = createFakeElasticsearchServer();

    const config = new ElasticsearchConfig(
      configSchema.validate({
        hosts: [`http://localhost:${esTestConfig.getPort()}`],
      })
    );
    const logger = loggerMock.create();
    const agentManager = new AgentManager(logger);

    client = configureClient(config, {
      logger,
      type: 'data',
      scoped: false,
      kibanaVersion: '8.5.0',
      agentFactoryProvider: agentManager,
    });
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) =>
      esServer.close((err) => (err ? reject(err) : resolve()))
    );
  });

  it('send the correct default headers to elasticsearch', async () => {
    await client.ping();

    expect(requests).toHaveLength(1);
    const headers = requests[0].headers;
    expect(headers).toEqual(
      expect.objectContaining({
        'user-agent': 'Kibana/8.5.0',
        'x-elastic-internal-origin': 'kibana',
        'x-elastic-product-origin': 'kibana',
      })
    );
  });
});
