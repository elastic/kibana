/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryOperator } from '../types';

/**
 * Appends a comment to the ESQL composer pipeline.
 * Comments are not actual ESQL commands but are included for documentation.
 *
 * @param text The comment text (without // prefix)
 * @returns A `QueryOperator` instance that adds the comment
 */
export function comment(text: string): QueryOperator {
  return (source) => {
    // Add comment as metadata to the source
    const commentData = {
      type: 'comment' as const,
      text: `// ${text}`,
      position: source.commands.length, // Position after current commands
    };

    return {
      ...source,
      comments: [...(source.comments || []), commentData],
    };
  };
}
