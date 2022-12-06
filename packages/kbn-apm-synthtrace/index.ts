/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { timerange } from './src/lib/timerange';
export { apm } from './src/lib/apm';
export { dedot } from './src/lib/utils/dedot';
export { observer } from './src/lib/agent_config';
export { createLogger, LogLevel } from './src/lib/utils/create_logger';

export type { SynthtraceGenerator } from './src/types';
export type { Fields } from './src/lib/entity';
export type { ApmFields } from './src/lib/apm/apm_fields';
export type { ApmException } from './src/lib/apm';
export type { Serializable } from './src/lib/serializable';
export type { ApmSynthtraceEsClient, ApmSynthtraceKibanaClient } from './src/lib/apm';
