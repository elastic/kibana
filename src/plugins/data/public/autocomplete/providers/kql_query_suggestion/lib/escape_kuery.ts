/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { escapeKuery } from '@kbn/es-query';

/**
 * Escapes backslashes and double-quotes. (Useful when putting a string in quotes to use as a value
 * in a KQL expression. See the QuotedCharacter rule in kuery.peg.)
 */
export function escapeQuotes(str: string) {
  return str.replace(/[\\"]/g, '\\$&');
}

// Re-export this function from the @kbn/es-query package to avoid refactoring
export { escapeKuery };
