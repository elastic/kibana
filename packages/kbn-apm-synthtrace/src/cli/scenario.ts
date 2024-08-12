/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Timerange } from '@kbn/apm-synthtrace-client';
import { ApmSynthtraceEsClient, InfraSynthtraceEsClient, LogsSynthtraceEsClient } from '../..';
import { Logger } from '../lib/utils/create_logger';
import { ScenarioReturnType } from '../lib/utils/with_client';
import { RunOptions } from './utils/parse_run_cli_flags';
import { EntitySynthtraceEsClient } from '../lib/entity/entity_syntrace_es_client';

type Generate<TFields> = (options: {
  range: Timerange;
  clients: {
    apmEsClient: ApmSynthtraceEsClient;
    logsEsClient: LogsSynthtraceEsClient;
    infraEsClient: InfraSynthtraceEsClient;
    entityEsClient: EntitySynthtraceEsClient;
  };
}) => ScenarioReturnType<TFields> | Array<ScenarioReturnType<TFields>>;

export type Scenario<TFields> = (options: RunOptions & { logger: Logger }) => Promise<{
  bootstrap?: (options: {
    apmEsClient: ApmSynthtraceEsClient;
    logsEsClient: LogsSynthtraceEsClient;
    infraEsClient: InfraSynthtraceEsClient;
    entityEsClient: EntitySynthtraceEsClient;
  }) => Promise<void>;
  generate: Generate<TFields>;
}>;
