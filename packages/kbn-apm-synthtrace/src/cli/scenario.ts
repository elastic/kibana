/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RunOptions } from './utils/parse_run_cli_flags';
import { EntityIterable } from '../lib/entity_iterable';

type Generate<TFields> = (range: { from: Date; to: Date }) => EntityIterable<TFields>;
export type Scenario<TFields> = (options: RunOptions) => Promise<{
  generate: Generate<TFields>;
  mapToIndex?: (data: Record<string, any>) => string;
}>;
