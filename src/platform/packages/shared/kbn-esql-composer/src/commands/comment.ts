/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Builder } from '@kbn/esql-ast';
import type { ESQLCommand, ESQLLiteral } from '@kbn/esql-ast';
import type { QueryOperator, Query } from '../types';

/**
 * Adds a comment annotation to the ESQL composer pipeline.
 * 
 * Note: ES|QL comments are typically inline with commands, not standalone.
 * This function creates a minimal ROW command with a comment decoration as a workaround
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
    // Determine if we need single-line or multi-line comment
    const lines = text.split('\n');
    const isMultiLine = lines.length > 1;
    
    // Create the comment node
    const commentNode = Builder.comment(
      isMultiLine ? 'multi-line' : 'single-line',
      isMultiLine ? ` ${text} ` : ` ${text}`,
      { min: 0, max: 0 }
    );
    
    // Create a minimal ROW 1 command
    const literal: ESQLLiteral = Builder.expression.literal.numeric({
      value: 1,
      name: '1',
    });
    
    const rowCommand: ESQLCommand = Builder.command({
      name: 'row',
      args: [literal],
      // Attach the comment as a top formatting decoration
      formatting: {
        top: [commentNode],
      },
    });
    
    return {
      root: source.root,
      commands: source.commands.concat(rowCommand),
      params: source.params,
    };
  };
}
