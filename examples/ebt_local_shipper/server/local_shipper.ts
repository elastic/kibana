/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AnalyticsClientInitContext, Event, IShipper } from '@kbn/core-analytics-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

export interface LocalShipperConfig {
  getElasticsearchClient: () => Promise<ElasticsearchClient>;
}

export class LocalShipper implements IShipper {
  public static shipperName = 'local_shipper_server';
  constructor(
    private readonly config: LocalShipperConfig,
    private readonly initContext: AnalyticsClientInitContext
  ) {}

  public reportEvents = (events: Event[]) => {
    this.config
      .getElasticsearchClient()
      .then((esClient) =>
        esClient.bulk({
          index: 'ebt-kibana-server',
          operations: events.flatMap((doc) => [{ create: {} }, doc]),
        })
      )
      .catch((err) => {
        this.initContext.logger.error(err);
      });
  };

  public optIn = () => {
    // required
  };
  public flush = async () => {
    // This shipper doesn't hold any queues. Nothing to flush in this method.
  };
  public shutdown = () => {
    // Implemented because it's required, but we don't really care here.
  };
}
