/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Fields, SynthtraceGenerator } from '@kbn/apm-synthtrace-client';
import { Readable } from 'stream';
import { SynthtraceEsClient } from '../shared/base_client';

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
