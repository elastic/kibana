/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const createRegExpPatternFrom = (basePatterns: string | string[], selectors: string[]) => {
  const indexNamePatterns = Array.isArray(basePatterns) ? basePatterns : [basePatterns];

  const { allowNoSelector, normalizedSelectors } = normalizeSelectors(selectors);

  return new RegExp(
    `^(?:(?:[^:,\\s]*:)?[^:,\\s]*(?:\\b|_)(?:${indexNamePatterns.join(
      '|'
    )})(?:\\b|_)(?:[^:,\\s]*)?(?:::(?:${normalizedSelectors.join('|')}))${
      allowNoSelector ? '?' : ''
    },?)+$`,
    'i'
  );
};

const normalizeSelectors = (
  selectors: string[]
): { allowNoSelector: boolean; normalizedSelectors: string[] } => {
  if (selectors.length === 0) {
    return { allowNoSelector: true, normalizedSelectors: ['data'] };
  } else if (selectors.includes('data')) {
    return { allowNoSelector: true, normalizedSelectors: selectors };
  } else {
    return { allowNoSelector: false, normalizedSelectors: selectors };
  }
};
