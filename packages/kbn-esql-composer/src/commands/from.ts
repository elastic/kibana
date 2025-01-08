/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { createPipeline } from '../create_pipeline';
import type { QueryPipeline } from '../types';
import { escapeIdentifier } from '../utils/escape_identifier';

export function from(...patterns: Array<string | string[]>): QueryPipeline {
  const allPatterns = patterns.flatMap((pattern) => pattern);

  return createPipeline({
    commands: [
      {
        body: `FROM ${allPatterns.map((pattern) => escapeIdentifier(pattern)).join(',')}`,
      },
    ],
  });
}
