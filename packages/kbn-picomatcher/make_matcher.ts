/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import pm from 'picomatch';

export type Matcher = (path: string) => boolean;

/**
 * Simplified version of picomatch options, focusing on options useful to Kibana
 * that we have actually tested.
 */
export interface MatchOptions {
  /**
   * One or more glob patterns for excluding strings that should not be matched from the result.
   */
  ignore?: string[];
  /**
   * Make matching case-insensitive. Equivalent to the regex `i` flag.
   */
  caseInsensitive?: boolean;
}

/**
 * Create a matcher function which will can test if a string matches any
 * of the positive patterns and none of the negative patterns
 */
export function makeMatcher(patterns: string[], options?: MatchOptions) {
  const negative: string[] = [];
  const positive: string[] = [];
  for (const e of patterns) {
    if (e.startsWith('!')) {
      negative.push(e.slice(1));
    } else {
      positive.push(e);
    }
  }

  const matcher = pm(positive, {
    nocase: options?.caseInsensitive,
    nonegate: true,
    ignore: [...(options?.ignore ?? []), ...negative],
  });

  return (val: string) => matcher(val);
}
