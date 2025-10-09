/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { synth } from '@kbn/esql-ast';
import type { QueryOperator, Query } from '../types';

/**
 * Adds a comment annotation to the ESQL composer pipeline.
 * 
 * Note: ES|QL comments are typically inline with commands, not standalone.
 * This function creates a minimal ROW command with a comment prefix as a workaround
 * to add documentation to your queries.
 *
 * @param text The comment text.
 * @returns A `QueryPipeline` instance with the comment added.
 *
 * @example
 * ```ts
 * from('logs-*')
 *   .pipe(
 *     comment('Filter for recent logs'),
 *     where('@timestamp >= NOW() - 1 hour')
 *   )
 * ```
 */
export function comment(text: string): QueryOperator {
  return (source): Query => {
    // Format the comment - use single-line for single lines, multi-line for multiple lines
    const lines = text.split('\n');
    const commentText = lines.length === 1
      ? `// ${text}`
      : `/* ${text} */`;
    
    // Create a ROW 1 command with the comment as a prefix
    // This will render as: // comment \n | ROW 1
    // The ROW 1 is a minimal no-op that ensures the comment is preserved
    const commentedCommand = synth.cmd(`${commentText}\nROW 1`);
    
    return {
      root: source.root,
      commands: source.commands.concat(commentedCommand),
      params: source.params,
    };
  };
}
