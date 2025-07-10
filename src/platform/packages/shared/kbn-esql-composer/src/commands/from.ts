/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '@kbn/esql-ast';
import { createPipeline } from '../create_pipeline';
import type { QueryPipeline } from '../types';

export function from(...patterns: Array<string | string[]>): QueryPipeline {
  const allPatterns = patterns.flatMap((pattern) => pattern);

  const { root } = parse(`FROM ${allPatterns.join(', ')}`);

  return createPipeline({
    root,
    commands: [],
    params: [],
  });
}
