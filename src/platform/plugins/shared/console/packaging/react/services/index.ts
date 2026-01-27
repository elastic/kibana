/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Export factory functions and types
export { createInjectedMetadata, type InjectedMetadataOptions } from './injected_metadata';
export { createCoreContext, type CoreContextOptions } from './core_context';
export { createTrackUiMetric, type TrackUiMetricOptions } from './track_ui_metric';

// Import factory functions for service initialization
import { createCoreContext } from './core_context';
import { createInjectedMetadata } from './injected_metadata';
import { createTrackUiMetric } from './track_ui_metric';

// Initialize and export service instances
export const coreContext = createCoreContext({
  version: '1.0.0',
  branch: 'main',
  buildNum: 1,
  buildSha: 'prod-build',
  buildShaShort: 'prod',
  mode: 'production',
  enableConsoleLogging: true,
});

export const injectedMetadata = createInjectedMetadata({
  kibanaBranch: 'main',
  kibanaVersion: '9.3.0',
  kibanaBuildNumber: 12345,
});

export const trackUiMetric = createTrackUiMetric();
