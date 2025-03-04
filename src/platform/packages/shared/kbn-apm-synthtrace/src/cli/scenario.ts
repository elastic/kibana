/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Timerange } from '@kbn/apm-synthtrace-client';
import { EntitiesSynthtraceKibanaClient } from '../lib/entities/entities_synthtrace_kibana_client';
import { Logger } from '../lib/utils/create_logger';
import { ScenarioReturnType } from '../lib/utils/with_client';
import { SynthtraceClients } from './utils/get_clients';
import { RunOptions } from './utils/parse_run_cli_flags';

interface KibanaClients {
  entitiesKibanaClient: EntitiesSynthtraceKibanaClient;
}

type Generate<TFields> = (options: {
  range: Timerange;
  clients: SynthtraceClients;
}) => ScenarioReturnType<TFields> | Array<ScenarioReturnType<TFields>>;

export type Scenario<TFields> = (
  options: RunOptions & { logger: Logger; from: Date; to: Date }
) => Promise<{
  bootstrap?: (options: SynthtraceClients & KibanaClients) => Promise<void>;
  generate: Generate<TFields>;
  teardown?: (options: SynthtraceClients & KibanaClients) => Promise<void>;
}>;
