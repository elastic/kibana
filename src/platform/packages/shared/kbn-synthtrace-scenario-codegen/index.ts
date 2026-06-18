/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { LICENSE_HEADER, CAPTURE_MAX_WINDOW_MS, MAX_ITEMS_PER_PAGE } from './src/constants';
export { Scrubber } from './src/scrubber';
export { createVarRegistry } from './src/var_registry';
export type { VarRegistry } from './src/var_registry';
export { quote, formatKey, formatValue, formatObject } from './src/format';
export { collectNumericLeaves, collectStringLeaves, isPlainObject } from './src/leaf_fields';
export type { LeafSource } from './src/leaf_fields';
export { searchAllPages } from './src/search_all_pages';
export type { PageSearchFn, SearchPageParams, SearchPageResponse } from './src/search_all_pages';
export { buildScenarioModule } from './src/build_scenario_module';
export type { BuildScenarioModuleOptions } from './src/build_scenario_module';

export { reconstructTrace } from './src/apm/reconstruct';
export type {
  CapturedSource,
  ReconstructedTrace,
  ReconstructOptions,
  ServiceRef,
  TraceNode,
  ErrorNode,
  MetricSample,
} from './src/apm/reconstruct';
export { generateScenario } from './src/apm/codegen';
export type { CodegenOptions } from './src/apm/codegen';
export { getApmCaptureDocs } from './src/apm/get_capture_docs';
export type {
  ApmCaptureSearchFn,
  ApmCaptureSearchRequest,
  ApmCaptureSearchResponse,
} from './src/apm/get_capture_docs';
