/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Wraps lines that exceed MAX_LINE_LENGTH at word boundaries,
 * indenting continuation lines with two spaces.
 * Tokens without spaces that are still too long are further
 * split at delimiter characters like `|` and `,`.
 */
/** @internal exported for testing */
export declare function wrapLines(text: string): string;
/** @internal */
export declare const buildFunctionDocumentation: (
  detail: string,
  signatures: Array<{
    declaration: string;
    license?: string;
  }>,
  examples: string[] | undefined
) => string;
/** @internal **/
export declare const buildDocumentation: (
  detail: string,
  declaration: string,
  examples?: string[]
) => string;
