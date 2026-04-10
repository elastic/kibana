/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { remapStringsToNestedState } from './remap_strings_to_nested_state';
import type { monaco } from '../../../monaco_imports';

describe('remapStringsToNestedState', () => {
  it('handles empty or undefined rules array', () => {
    expect(remapStringsToNestedState(undefined, '@nested_string')).toEqual([]);
    expect(remapStringsToNestedState([], '@nested_string')).toEqual([]);
  });

  it('leaves non-array rules unmodified', () => {
    const rules: monaco.languages.IMonarchLanguageRule[] = [{ include: '@comments' }];
    expect(remapStringsToNestedState(rules, '@nested_string')).toEqual(rules);
  });

  it('leaves string action rules unmodified', () => {
    const rules: monaco.languages.IMonarchLanguageRule[] = [[/"/, 'string']];
    expect(remapStringsToNestedState(rules, '@nested_string')).toEqual(rules);
  });

  it('leaves object action rules without next:@string unmodified', () => {
    const rules: monaco.languages.IMonarchLanguageRule[] = [
      [/"/, { token: 'string', next: '@other' }],
      [/"/, { token: 'string' }],
    ];
    expect(remapStringsToNestedState(rules, '@nested_string')).toEqual(rules);
  });

  it('remaps rules with next:@string to the nested state', () => {
    const rules: monaco.languages.IMonarchLanguageRule[] = [
      [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],
    ];
    const remapped = remapStringsToNestedState(rules, '@nested_string');
    expect(remapped).toEqual([
      [/"/, { token: 'string.quote', bracket: '@open', next: '@nested_string' }],
    ]);
  });
});
