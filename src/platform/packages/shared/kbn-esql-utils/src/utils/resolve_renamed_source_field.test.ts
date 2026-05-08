/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolveRenamedSourceField } from './resolve_renamed_source_field';

describe('resolveRenamedSourceField', () => {
  it('returns the same name when pairs are missing or empty', () => {
    expect(resolveRenamedSourceField('host', undefined)).toBe('host');
    expect(resolveRenamedSourceField('host', new Set())).toBe('host');
  });

  it('resolves a single RENAME pair', () => {
    const pairs = new Set<[string, string]>([['new_name', 'old_name']]);
    expect(resolveRenamedSourceField('new_name', pairs)).toBe('old_name');
  });

  it('composes STATS BY alias and subsequent RENAME (test2 -> test -> agent.keyword)', () => {
    const pairs = new Set<[string, string]>([
      ['test', 'agent.keyword'],
      ['test2', 'test'],
    ]);
    expect(resolveRenamedSourceField('test2', pairs)).toBe('agent.keyword');
  });

  it('leaves a name unchanged when it is not the new side of any pair', () => {
    const pairs = new Set<[string, string]>([['b', 'a']]);
    expect(resolveRenamedSourceField('a', pairs)).toBe('a');
    expect(resolveRenamedSourceField('other', pairs)).toBe('other');
  });

  it('stops on a cycle in pair metadata', () => {
    const pairs = new Set<[string, string]>([
      ['a', 'b'],
      ['b', 'a'],
    ]);
    const resolved = resolveRenamedSourceField('a', pairs);
    expect(resolved === 'a' || resolved === 'b').toBe(true);
  });
});
