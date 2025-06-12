/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsClientInitContext, Event, IShipper } from '@kbn/core-analytics-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { TELEMETRY_LOCAL_EBT_INDICES } from '../../common/local_shipper';

export interface LocalShipperConfig {
  getElasticsearchClient: () => Promise<ElasticsearchClient>;
}

export class LocalEBTShipper implements IShipper {
  public static shipperName = 'local_ebt_shipper_server';

  constructor(
    private readonly config: LocalShipperConfig,
    private readonly initContext: AnalyticsClientInitContext
  ) {}

  public reportEvents = (events: Event[]) => {
    this.config
      .getElasticsearchClient()
      .then((esClient) =>
        esClient.bulk({
          index: TELEMETRY_LOCAL_EBT_INDICES.SERVER,
          operations: events.flatMap((doc) => [{ create: {} }, doc]),
        })
      )
      .catch((err) => {
        this.initContext.logger.error(err);
      });
  };

  public optIn = () => {
    // This shipper doesn't need to update anything internal on optIn changes
  };
  public flush = async () => {
    // This shipper doesn't hold any queues. Nothing to flush in this method.
  };
  public shutdown = () => {
    // This shipper doesn't hold any internal queues or instantiated properties. No need to clean up anything in this method.
  };
}
