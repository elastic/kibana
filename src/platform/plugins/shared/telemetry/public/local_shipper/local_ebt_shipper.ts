/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsClientInitContext, Event, IShipper } from '@kbn/core-analytics-browser';
import type { HttpStart } from '@kbn/core-http-browser';

export interface LocalShipperConfig {
  getHttpStart: () => Promise<HttpStart>;
}

export class LocalEBTShipper implements IShipper {
  public static shipperName = 'local_ebt_shipper_browser';
  constructor(
    private readonly config: LocalShipperConfig,
    private readonly initContext: AnalyticsClientInitContext
  ) {}

  public reportEvents = (events: Event[]) => {
    this.config
      .getHttpStart()
      .then((http) =>
        http.post('/internal/telemetry/ebt_local_shipper', {
          body: JSON.stringify({ events }),
          version: '1',
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
