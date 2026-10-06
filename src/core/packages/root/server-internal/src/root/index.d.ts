/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LoggerFactory } from '@kbn/logging';
import type { Env, RawConfigurationProvider } from '@kbn/config';
/**
 * Top-level entry point to kick off the app and start the Kibana server.
 */
export declare class Root {
  private readonly onShutdown?;
  readonly logger: LoggerFactory;
  private readonly log;
  private readonly loggingSystem;
  private readonly server;
  private loggingConfigSubscription?;
  private apmConfigSubscription?;
  private shuttingDown;
  constructor(
    rawConfigProvider: RawConfigurationProvider,
    env: Env,
    onShutdown?: ((reason?: Error | string) => void) | undefined
  );
  preboot(): Promise<
    import('@kbn/core/packages/lifecycle/server-internal').InternalCorePreboot | undefined
  >;
  setup(): Promise<import('@kbn/core/packages/lifecycle/server-internal').InternalCoreSetup>;
  start(): Promise<import('@kbn/core/packages/lifecycle/server-internal').InternalCoreStart>;
  shutdown(reason?: any): Promise<void>;
  getConfigService(): import('@kbn/config').ConfigService;
  private setupApmLabelSync;
  private setupLogging;
}
