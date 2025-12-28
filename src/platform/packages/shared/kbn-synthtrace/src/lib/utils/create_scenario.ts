/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Fields } from '@kbn/synthtrace-client';
import type { Scenario, ScenarioInitOptions } from '../../cli/scenario';
import type { SynthtraceClients } from '../../cli/utils/clients_manager';
import type { KibanaClient } from '../shared/base_kibana_client';

type ScenarioResult<TFields extends Fields> = Awaited<ReturnType<Scenario<TFields>>>;

type GenerateFn<TFields extends Fields> = ScenarioResult<TFields>['generate'];

type ScenarioOptions<TFields extends Fields> = Omit<
  ScenarioResult<TFields>,
  'bootstrap' | 'teardown'
> & {
  bootstrap?: (
    clients: SynthtraceClients,
    kibanaClient: KibanaClient,
    options: ScenarioInitOptions
  ) => Promise<void>;
  teardown?: (
    clients: SynthtraceClients,
    kibanaClient: KibanaClient,
    options: ScenarioInitOptions
  ) => Promise<void>;
};

export function createCliScenario<TFields extends Fields>(
  generatorOrOptions: GenerateFn<TFields> | ScenarioOptions<TFields>
): Scenario<TFields> {
  if (typeof generatorOrOptions === 'function') {
    return async () => ({
      generate: ({ range, clients }) => generatorOrOptions({ range, clients }),
    });
  }

  const { generate, bootstrap, teardown, setupPipeline } = generatorOrOptions;

  return async (initOptions) => ({
    generate: ({ range, clients }) => generate({ range, clients }),
    ...(bootstrap && {
      bootstrap: (clients, kibanaClient) => bootstrap(clients, kibanaClient, initOptions),
    }),
    ...(teardown && {
      teardown: (clients, kibanaClient) => teardown(clients, kibanaClient, initOptions),
    }),
    ...(setupPipeline && { setupPipeline }),
  });
}
