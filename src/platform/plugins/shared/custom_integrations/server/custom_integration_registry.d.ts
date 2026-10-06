/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type { CustomIntegration } from '../common';
export declare class CustomIntegrationRegistry {
  private readonly _integrations;
  private readonly _logger;
  private readonly _isDev;
  /**
   * Deferred initializers registered via {@link registerDeferredInitializer}.  They are
   * called (in order, exactly once) the first time the integration list is read, so that
   * callers can avoid executing expensive work (e.g. evaluating i18n strings) at plugin
   * start time.
   */
  private readonly _deferredInitializers;
  constructor(logger: Logger, isDev: boolean);
  registerDeferredInitializer(init: () => void): void;
  private _materializeDeferredInitializers;
  registerCustomIntegration(customIntegration: CustomIntegration): void;
  getAppendCustomIntegrations(): CustomIntegration[];
  getReplacementCustomIntegrations(): CustomIntegration[];
}
