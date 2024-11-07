/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esTestConfig } from '@kbn/test';
import * as http from 'http';
import { loggerMock } from '@kbn/logging-mocks';
import { Root } from '@kbn/core-root-server-internal';
import {
  PRODUCT_RESPONSE_HEADER,
  USER_AGENT_HEADER,
  configureClient,
  AgentManager,
} from '@kbn/core-elasticsearch-client-server-internal';
import { configSchema, ElasticsearchConfig } from '@kbn/core-elasticsearch-server-internal';

function createFakeElasticsearchServer(hook: (req: http.IncomingMessage) => void) {
  const server = http.createServer((req, res) => {
    hook(req);
    res.writeHead(200, undefined, { [PRODUCT_RESPONSE_HEADER]: 'Elasticsearch' });
    res.write('{}');
    res.end();
  });
  server.listen(esTestConfig.getPort());

  return server;
}

describe('ES Client - custom user-agent', () => {
  let esServer: http.Server;
  let kibanaServer: Root;

  afterAll(async () => {
    try {
      await kibanaServer?.shutdown();
    } catch (e) {
      // trap
    }
    try {
      await new Promise<void>((resolve, reject) =>
        esServer.close((err) => (err ? reject(err) : resolve()))
      );
    } catch (e) {
      // trap
    }
  });

  test('should send a custom user-agent header matching the expected format', async () => {
    const kibanaVersion = '8.42.9';
    const logger = loggerMock.create();
    const rawConfig = configSchema.validate({
      hosts: [`${esTestConfig.getUrl()}`],
    });
    const config = new ElasticsearchConfig(rawConfig);
    const agentFactoryProvider = new AgentManager(logger, { dnsCacheTtlInSeconds: 0 });
    const esClient = configureClient(config, {
      type: 'foo',
      logger,
      kibanaVersion,
      agentFactoryProvider,
    });

    let userAgentHeader: string | undefined;
    esServer = createFakeElasticsearchServer((res) => {
      userAgentHeader = res.headers[USER_AGENT_HEADER];
    });

    await esClient.ping();

    expect(userAgentHeader).toEqual(`Kibana/${kibanaVersion}`);
  });
});
