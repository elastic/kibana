/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '@kbn/esql-language';
import { createPipeline } from '../pipeline/create_pipeline';
import type { QueryPipeline } from '../types';

/**
 * The entry point for the ESQL composer pipeline. Creates a new query
 * starting with a `FROM` or `TS` clause.
 *
 * @param patterns The index patterns to query.
 * @returns A `QueryPipeline` instance to which other composer commands can be chained.
 */

function buildPipeline(
  command: 'TS' | 'FROM',
  ...patterns: Array<string | string[]>
): QueryPipeline {
  const allPatterns = patterns.flat();
  const { root } = parse(`${command} ${allPatterns.join(', ')}`);

  return createPipeline({
    root,
    commands: [],
    params: [],
  });
}

/**
 * @deprecated Migrate to `@kbn/esql-language` composer.
 */
export function timeseries(...patterns: Array<string | string[]>): QueryPipeline {
  return buildPipeline('TS', ...patterns);
}

/**
 * @deprecated Migrate to `@kbn/esql-language` composer.
 */
export function from(...patterns: Array<string | string[]>): QueryPipeline {
  return buildPipeline('FROM', ...patterns);
}
