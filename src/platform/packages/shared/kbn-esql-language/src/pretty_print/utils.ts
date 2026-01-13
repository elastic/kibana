/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { default as esql_lexer } from '../parser/antlr/esql_lexer';

let _quotableKeywords: Set<string> | undefined;

/**
 * Lazily retrieves a set of keywords that should be quoted in ESQL.
 *
 * @returns Set of keywords that should be quoted in ESQL.
 */
export const quotableKeywords = (): Set<string> => {
  if (_quotableKeywords) {
    return _quotableKeywords;
  }
  _quotableKeywords = new Set<string>();

  for (const literalName of esql_lexer.literalNames) {
    // Remove null and empty strings
    if (typeof literalName !== 'string') {
      continue;
    }

    const lastChar = literalName.length - 1;

    // ANTLR wraps literals with single quotes, so we check for that.
    if (literalName[0] !== "'" || literalName[lastChar] !== "'") {
      continue;
    }

    const keyword = literalName.slice(1, lastChar);

    // Only add non-empty keywords that consist of alphanumeric characters or
    // underscores. This prevents adding symbols like `::`, `,`, etc.
    if (/^\w+$/.test(keyword)) {
      _quotableKeywords.add(keyword.toUpperCase());
    }
  }

  return _quotableKeywords;
};
