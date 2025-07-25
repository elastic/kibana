/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Fields, Timerange } from '@kbn/apm-synthtrace-client';
import { Logger } from '../lib/utils/create_logger';
import { ScenarioReturnType } from '../lib/utils/with_client';
import { SynthtraceClients } from './utils/clients_manager';
import { RunOptions } from './utils/parse_run_cli_flags';

export type ScenarioInitOptions = RunOptions & { logger: Logger; from: number; to: number };
export type ScenarioPhaseOptions = SynthtraceClients;

type Generate<TFields extends Fields> = (options: {
  range: Timerange;
  clients: SynthtraceClients;
}) => ScenarioReturnType<TFields> | Array<ScenarioReturnType<TFields>>;

export type Scenario<TFields extends Fields = Fields> = (options: ScenarioInitOptions) => Promise<{
  bootstrap?: (options: ScenarioPhaseOptions) => Promise<void>;
  generate: Generate<TFields>;
  teardown?: (options: ScenarioPhaseOptions) => Promise<void>;
  setupPipeline?: (options: ScenarioPhaseOptions) => void;
}>;
