/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Readable } from 'stream';
import { Timerange } from '../lib/timerange';
import { SynthtraceGenerator } from '../types';
import { RunOptions } from './utils/parse_run_cli_flags';

type Generate<TFields> = (options: {
  range: Timerange;
}) => SynthtraceGenerator<TFields> | Array<SynthtraceGenerator<TFields>> | Readable;
export type Scenario<TFields> = (options: RunOptions) => Promise<{
  generate: Generate<TFields>;
}>;
