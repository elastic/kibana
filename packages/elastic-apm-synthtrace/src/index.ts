/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { timerange } from './lib/timerange';
export { apm } from './lib/apm';
export { stackMonitoring } from './lib/stack_monitoring';
export { cleanWriteTargets } from './lib/utils/clean_write_targets';
export { createLogger, LogLevel } from './lib/utils/create_logger';

export type { Fields } from './lib/entity';
export type { ApmFields } from './lib/apm/apm_fields';
export type { ApmException, ApmSynthtraceEsClient } from './lib/apm';
export type { EntityIterable, EntityArrayIterable } from './lib/entity_iterable';
