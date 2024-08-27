/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Timerange } from '@kbn/apm-synthtrace-client';
import { ApmSynthtraceEsClient, InfraSynthtraceEsClient, LogsSynthtraceEsClient } from '../..';
import { AssetsSynthtraceEsClient } from '../lib/assets/assets_synthtrace_es_client';
import { Logger } from '../lib/utils/create_logger';
import { ScenarioReturnType } from '../lib/utils/with_client';
import { RunOptions } from './utils/parse_run_cli_flags';

interface EsClients {
  apmEsClient: ApmSynthtraceEsClient;
  logsEsClient: LogsSynthtraceEsClient;
  infraEsClient: InfraSynthtraceEsClient;
  assetsEsClient: AssetsSynthtraceEsClient;
}

type Generate<TFields> = (options: {
  range: Timerange;
  clients: EsClients;
}) => ScenarioReturnType<TFields> | Array<ScenarioReturnType<TFields>>;

export type Scenario<TFields> = (options: RunOptions & { logger: Logger }) => Promise<{
  bootstrap?: (options: EsClients) => Promise<void>;
  generate: Generate<TFields>;
}>;
