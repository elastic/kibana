/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AnalyticsClientInitContext, Event, IShipper } from '@kbn/core-analytics-browser';
import type { HttpStart } from '@kbn/core-http-browser';

export interface LocalShipperConfig {
  getHttpStart: () => Promise<HttpStart>;
}

export class LocalShipper implements IShipper {
  public static shipperName = 'local_shipper_browser';
  constructor(
    private readonly config: LocalShipperConfig,
    private readonly initContext: AnalyticsClientInitContext
  ) {}

  public reportEvents = (events: Event[]) => {
    this.config
      .getHttpStart()
      .then((http) =>
        http.post('/internal/example/ebt_local_shipper', {
          body: JSON.stringify({ events }),
          version: '1',
        })
      )
      .catch((err) => {
        this.initContext.logger.error(err);
      });
  };

  public optIn = () => {
    // Implemented because it's required, but we don't really care here.
  };
  public flush = async () => {
    // Implemented because it's required, but we don't really care here.
  };
  public shutdown = () => {
    // Implemented because it's required, but we don't really care here.
  };
}
