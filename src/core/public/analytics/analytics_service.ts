/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AnalyticsClient } from '@kbn/analytics-client';
import { createAnalytics } from '@kbn/analytics-client';
import { CoreContext } from '../core_system';
import { createLogger } from './logger';

/**
 * Exposes the public APIs of the AnalyticsClient during the setup phase.
 * {@link AnalyticsClient}
 * @public
 */
export type AnalyticsServiceSetup = AnalyticsClient;
/**
 * Exposes the public APIs of the AnalyticsClient during the start phase
 * {@link AnalyticsClient}
 * @public
 */
export type AnalyticsServiceStart = Pick<
  AnalyticsClient,
  'optIn' | 'reportEvent' | 'telemetryCounter$'
>;

export class AnalyticsService {
  private readonly analyticsClient: AnalyticsClient;

  constructor(core: CoreContext) {
    this.analyticsClient = createAnalytics({
      isDev: core.env.mode.dev,
      logger: createLogger(core.env.mode.dev),
      // TODO: We need to be able to edit sendTo once we resolve the telemetry config.
      //  For now, we are relying on whether it's a distributable or running from source.
      sendTo: core.env.packageInfo.dist ? 'production' : 'staging',
    });
  }

  public setup(): AnalyticsServiceSetup {
    return {
      optIn: this.analyticsClient.optIn,
      registerContextProvider: this.analyticsClient.registerContextProvider,
      removeContextProvider: this.analyticsClient.removeContextProvider,
      registerEventType: this.analyticsClient.registerEventType,
      registerShipper: this.analyticsClient.registerShipper,
      reportEvent: this.analyticsClient.reportEvent,
      telemetryCounter$: this.analyticsClient.telemetryCounter$,
    };
  }
  public start(): AnalyticsServiceStart {
    return {
      optIn: this.analyticsClient.optIn,
      reportEvent: this.analyticsClient.reportEvent,
      telemetryCounter$: this.analyticsClient.telemetryCounter$,
    };
  }
}
