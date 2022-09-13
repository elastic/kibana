/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { service } from '../../dsl/apm/service';
import { browser } from '../../dsl/apm/browser';
import { SynthtraceEsClient } from '../client/synthtrace_es_client';
import { SynthtraceKibanaClient } from '../client/synthtrace_kibana_client';
import { serverlessFunction } from '../../dsl/apm/serverless/serverless_function';

import type { ApmException, ApmFields } from '../../dsl/apm/apm_fields';
import { ApmScenarioDefaults } from './apm_scenario_defaults';
import { ScenarioDescriptor } from '../../cli/scenario';

// explicitly typed because ApmScenarioDefaults because type definition file eats the generics
// e.g. Omit<ScenarioDescriptorApmFields>, 'generate' | 'mapToIndex'>
export const apm: {
  defaults: Omit<ScenarioDescriptor<ApmFields>, 'generate' | 'mapToIndex'>;
  service: typeof service;
  browser: typeof browser;
  SynthtraceEsClient: typeof SynthtraceEsClient;
  SynthtraceKibanaClient: typeof SynthtraceKibanaClient;
  serverlessFunction: typeof serverlessFunction;
} = {
  defaults: ApmScenarioDefaults,
  service,
  browser,
  SynthtraceEsClient,
  SynthtraceKibanaClient,
  serverlessFunction,
};

export type { ApmFields, SynthtraceEsClient, ApmException };
