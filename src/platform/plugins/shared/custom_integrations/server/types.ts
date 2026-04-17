/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CustomIntegration } from '../common';

export interface CustomIntegrationsPluginSetup {
  registerCustomIntegration(customIntegration: Omit<CustomIntegration, 'type'>): void;
  getAppendCustomIntegrations(): CustomIntegration[];
  /**
   * Registers a deferred initializer that will be called (once, in registration order) the
   * first time the integration list is read.  Use this to avoid evaluating i18n strings and
   * building registration payloads at plugin start time — work is deferred to the first
   * incoming HTTP request instead.
   */
  registerDeferredIntegrations(init: () => void): void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CustomIntegrationsPluginStart {}
