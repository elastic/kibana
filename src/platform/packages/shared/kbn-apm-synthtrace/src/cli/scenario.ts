/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Timerange } from '@kbn/apm-synthtrace-client';
import {
  ApmSynthtraceEsClient,
  InfraSynthtraceEsClient,
  LogsSynthtraceEsClient,
  SyntheticsSynthtraceEsClient,
  OtelSynthtraceEsClient,
  EntitiesSynthtraceEsClient,
} from '../..';
import { Logger } from '../lib/utils/create_logger';
import { ScenarioReturnType } from '../lib/utils/with_client';
import { RunOptions } from './utils/parse_run_cli_flags';
import { EntitiesSynthtraceKibanaClient } from '../lib/entities/entities_synthtrace_kibana_client';

interface EsClients {
  apmEsClient: ApmSynthtraceEsClient;
  logsEsClient: LogsSynthtraceEsClient;
  infraEsClient: InfraSynthtraceEsClient;
  syntheticsEsClient: SyntheticsSynthtraceEsClient;
  otelEsClient: OtelSynthtraceEsClient;
  entitiesEsClient: EntitiesSynthtraceEsClient;
}

interface KibanaClients {
  entitiesKibanaClient: EntitiesSynthtraceKibanaClient;
}

type Generate<TFields> = (options: {
  range: Timerange;
  clients: EsClients;
}) => ScenarioReturnType<TFields> | Array<ScenarioReturnType<TFields>>;

export type Scenario<TFields> = (options: RunOptions & { logger: Logger }) => Promise<{
  bootstrap?: (options: EsClients & KibanaClients) => Promise<void>;
  generate: Generate<TFields>;
  teardown?: (options: EsClients & KibanaClients) => Promise<void>;
}>;
