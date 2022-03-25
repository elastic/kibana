/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AnalyticsClient } from '@elastic/analytics';
import type { Logger } from '@kbn/logging';
import { createAnalytics } from '@elastic/analytics';
import { CoreContext } from '../core_system';

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
export type AnalyticsServiceStart = AnalyticsClient;

export class AnalyticsService {
  private readonly analyticsClient: AnalyticsClient;

  constructor(core: CoreContext) {
    // TODO: Replace with a core logger once we implement it.
    // For now, it logs only in dev mode
    const logger: Logger = {
      // eslint-disable-next-line no-console
      fatal: (...args) => (core.env.mode.dev ? console.error(...args) : void 0),
      // eslint-disable-next-line no-console
      error: (...args) => (core.env.mode.dev ? console.error(...args) : void 0),
      // eslint-disable-next-line no-console
      warn: (...args) => (core.env.mode.dev ? console.warn(...args) : void 0),
      // eslint-disable-next-line no-console
      info: (...args) => (core.env.mode.dev ? console.info(...args) : void 0),
      // eslint-disable-next-line no-console
      debug: (...args) => (core.env.mode.dev ? console.debug(...args) : void 0),
      // eslint-disable-next-line no-console
      trace: (...args) => (core.env.mode.dev ? console.trace(...args) : void 0),
      // eslint-disable-next-line no-console
      log: (...args) => (core.env.mode.dev ? console.log(...args) : void 0),
      get: () => logger,
    };

    this.analyticsClient = createAnalytics({
      isDev: core.env.mode.dev,
      logger,
      // TODO: We need to be able to edit sendTo once we resolve the telemetry config.
      //  For now, we are relying on whether it's a distributable or running from source.
      sendTo: core.env.packageInfo.dist ? 'production' : 'staging',
    });
  }

  public setup(): AnalyticsServiceSetup {
    return {
      optIn: this.analyticsClient.optIn,
      registerContextProvider: this.analyticsClient.registerContextProvider,
      registerEventType: this.analyticsClient.registerEventType,
      registerShipper: this.analyticsClient.registerShipper,
      reportEvent: this.analyticsClient.reportEvent,
      telemetryCounter$: this.analyticsClient.telemetryCounter$,
    };
  }
  public start(): AnalyticsServiceStart {
    return {
      optIn: this.analyticsClient.optIn,
      registerContextProvider: this.analyticsClient.registerContextProvider,
      registerEventType: this.analyticsClient.registerEventType,
      registerShipper: this.analyticsClient.registerShipper,
      reportEvent: this.analyticsClient.reportEvent,
      telemetryCounter$: this.analyticsClient.telemetryCounter$,
    };
  }
}
