/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type { Exception } from './lib/entity';
export { service } from './lib/service';
export { browser } from './lib/browser';
export { timerange } from './lib/timerange';
export { getTransactionMetrics } from './lib/utils/get_transaction_metrics';
export { getSpanDestinationMetrics } from './lib/utils/get_span_destination_metrics';
export { getObserverDefaults } from './lib/defaults/get_observer_defaults';
export { getChromeUserAgentDefaults } from './lib/defaults/get_chrome_user_agent_defaults';
export { toElasticsearchOutput } from './lib/output/to_elasticsearch_output';
export { getBreakdownMetrics } from './lib/utils/get_breakdown_metrics';
export { cleanWriteTargets } from './lib/utils/clean_write_targets';
export { getWriteTargets } from './lib/utils/get_write_targets';
export { SynthtraceEsClient } from './lib/client/synthtrace_es_client';
export { createLogger, LogLevel } from './lib/utils/create_logger';
