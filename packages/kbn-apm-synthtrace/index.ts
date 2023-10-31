/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { createLogger, LogLevel } from './src/lib/utils/create_logger';

export { ApmSynthtraceEsClient } from './src/lib/apm/client/apm_synthtrace_es_client';
export { ApmSynthtraceKibanaClient } from './src/lib/apm/client/apm_synthtrace_kibana_client';

export { InfraSynthtraceEsClient } from './src/lib/infra/infra_synthtrace_es_client';

export { AssetsSynthtraceEsClient } from './src/lib/assets/assets_synthtrace_es_client';

export { MonitoringSynthtraceEsClient } from './src/lib/monitoring/monitoring_synthtrace_es_client';

export {
  addObserverVersionTransform,
  deleteSummaryFieldTransform,
} from './src/lib/utils/transform_helpers';
