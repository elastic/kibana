/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ElasticsearchClient } from '@kbn/core/server';
import {
  createTestServers,
  type TestUtils,
  type TestElasticsearchUtils,
  type TestKibanaUtils,
} from '@kbn/core-test-helpers-kbn-server';

export class EsqlServiceTestbed {
  public servers?: TestUtils;
  public es?: TestElasticsearchUtils;
  public kibana?: TestKibanaUtils;

  public async start() {
    this.servers = createTestServers({ adjustTimeout: jest.setTimeout });
    this.es = await this.servers.startES();
    this.kibana = await this.servers.startKibana();
  }

  public async stop() {
    await this.kibana?.root?.shutdown();
    await this.kibana?.stop();
    await this.es?.stop();
  }

  public esClient(): ElasticsearchClient {
    const client = this.kibana?.coreStart.elasticsearch.client.asInternalUser;

    if (!client) {
      throw new Error('ES client not available, make sure to call `.start()`');
    }

    return client;
  }
}
