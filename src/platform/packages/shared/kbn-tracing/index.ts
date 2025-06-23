/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { LateBindingSpanProcessor } from './src/late_binding_span_processor';
export { initTracing, tracingApi } from './src/init_tracing';
export type { ElasticApmApi } from './src/bridge/elastic_apm_api';
export type { ElasticTransactionApi } from './src/bridge/elastic_apm_api';
export type { TracingApi } from './src/types';
export { createWithActiveSpan } from './src/utils/create_with_active_span';
export { withActiveSpan } from './src/utils/with_active_span';
