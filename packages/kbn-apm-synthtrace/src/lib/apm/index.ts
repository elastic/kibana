/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { service } from '../../dsl/apm/service';
import { browser } from '../../dsl/apm/browser';
import { serverlessFunction } from '../../dsl/apm/serverless/serverless_function';
import { getChromeUserAgentDefaults } from './defaults/get_chrome_user_agent_defaults';
import type { ApmException, ApmFields } from '../../dsl/apm/apm_fields';
import { ApmScenarioDefaults } from './apm_scenario_defaults';
import { ScenarioDescriptor } from '../../cli/scenario';

export const apm = {
  service,
  browser,
  serverlessFunction,
  getChromeUserAgentDefaults,
};

// explicitly typed because ApmScenarioDefaults because type definition file eats the generics
// e.g. Omit<ScenarioDescriptorApmFields>, 'generate' | 'mapToIndex'>
// separate export since `apm` gets imported client side during cyprus e2e tests.
// Scenario defaults exposes StreamAggregator which has a bootstrap method taking Client
// which is not safe to export to the client side
export const apmDefaults: Omit<
  ScenarioDescriptor<ApmFields>,
  'generate' | 'mapToIndex'
> = ApmScenarioDefaults;

export type { ApmFields, ApmException };
