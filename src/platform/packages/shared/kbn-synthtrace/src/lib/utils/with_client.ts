/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Fields, SynthtraceGenerator } from '@kbn/synthtrace-client';
import type { Readable } from 'stream';
import type { SynthtraceEsClient } from '../shared/base_client';

export type SynthGenerator<TFields extends Fields> =
  | SynthtraceGenerator<TFields>
  | Array<SynthtraceGenerator<TFields>>
  | Readable;

export const withClient = <TFields extends Fields>(
  client: SynthtraceEsClient<TFields>,
  generator: SynthGenerator<TFields>
) => {
  return {
    client,
    generator,
  };
};

export type ScenarioReturnType<TFields extends Fields> = ReturnType<typeof withClient<TFields>>;

export async function indexAll(
  scenarios: ScenarioReturnType<Fields> | ScenarioReturnType<Fields>[]
): Promise<void> {
  const scenarioArray = Array.isArray(scenarios) ? scenarios : [scenarios];
  await Promise.all(scenarioArray.map(({ client, generator }) => client.index(generator)));
}
