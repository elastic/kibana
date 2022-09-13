/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { timerange } from './src/dsl/timerange';
export { apm } from './src/lib/apm';
export type { ApmFields, ApmException, SynthtraceEsClient } from './src/lib/apm';

export { stackMonitoring } from './src/dsl/stack_monitoring';
export { observer } from './src/dsl/apm/agent_config';
export { createLogger, LogLevel } from './src/lib/utils/create_logger';

export type { Fields } from './src/dsl/fields';

export type { SignalIterable } from './src/lib/streaming/signal_iterable';
export { SignalArrayIterable } from './src/lib/streaming/signal_iterable';

export { StreamProcessor } from './src/lib/streaming/stream_processor';
export type { StreamProcessorOptions } from './src/lib/streaming/stream_processor';
