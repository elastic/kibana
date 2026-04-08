/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '../../../monaco_imports';

/**
 * Rewrites string-entry rules so that `next: '@string'` points to a nested
 * state instead, avoiding conflicts with the Console JSON `@string` state.
 *
 * The function narrows `IMonarchLanguageAction` through runtime checks so that
 * the returned rules are fully typed without assertions or wide types.
 */
export const remapStringsToNestedState = (
  rules: monaco.languages.IMonarchLanguageRule[] = [],
  nestedState: string
): monaco.languages.IMonarchLanguageRule[] => {
  return rules.map((rule) => {
    if (!Array.isArray(rule) || rule.length < 2) return rule;

    const regex = rule[0];
    const action = rule[1];

    if (typeof action === 'string' || Array.isArray(action) || action.next !== '@string') {
      return rule;
    }

    const remapped: monaco.languages.IShortMonarchLanguageRule1 = [
      regex,
      { ...action, next: nestedState },
    ];
    return remapped;
  });
};
