/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  assertExecutionLabelsOwnedBy,
  EXECUTION_LABEL_VALUE_MAX_LENGTH,
  EXECUTION_LABELS_MAX_KEYS,
  matchesImmutableIdentity,
  mergeExecutionLabels,
  normalizeExecutionLabels,
} from './execution_labels';

describe('normalizeExecutionLabels', () => {
  it('stringifies scalar values', () => {
    expect(normalizeExecutionLabels({ 'hunt.count': 3, 'hunt.ok': true, 'hunt.id': 'a' })).toEqual({
      'hunt.count': '3',
      'hunt.ok': 'true',
      'hunt.id': 'a',
    });
  });

  it.each([null, 'x', ['a'], 4])('rejects non-object input %p', (input) => {
    expect(() => normalizeExecutionLabels(input)).toThrow('must be an object');
  });

  it.each(['Hunt.x', 'hunt', '1hunt.x', 'hunt.x-y', `h.${'a'.repeat(64)}`])(
    'rejects invalid key %p',
    (key) => {
      expect(() => normalizeExecutionLabels({ [key]: 'v' })).toThrow('namespaced key');
    }
  );

  it('rejects non-scalar and non-finite values', () => {
    expect(() => normalizeExecutionLabels({ 'hunt.a': { b: 1 } })).toThrow('must be a string');
    expect(() => normalizeExecutionLabels({ 'hunt.a': null })).toThrow('must be a string');
    expect(() => normalizeExecutionLabels({ 'hunt.a': Infinity })).toThrow('must be a string');
  });

  it('bounds value length and key count', () => {
    expect(() =>
      normalizeExecutionLabels({ 'hunt.a': 'x'.repeat(EXECUTION_LABEL_VALUE_MAX_LENGTH + 1) })
    ).toThrow('exceeds');
    const tooMany = Object.fromEntries(
      Array.from({ length: EXECUTION_LABELS_MAX_KEYS + 1 }, (_, i) => [`hunt.k${i}`, 'v'])
    );
    expect(() => normalizeExecutionLabels(tooMany)).toThrow('at most');
    expect(() =>
      normalizeExecutionLabels({ 'hunt.a': 'x'.repeat(EXECUTION_LABEL_VALUE_MAX_LENGTH) })
    ).not.toThrow();
  });
});

describe('assertExecutionLabelsOwnedBy', () => {
  const namespaces = new Map([
    ['hunt', 'alertzero'],
    ['other', 'someplugin'],
  ]);

  it('allows keys in the owner namespace', () => {
    expect(() =>
      assertExecutionLabelsOwnedBy({ 'hunt.outcome': 'clean' }, 'alertzero', namespaces)
    ).not.toThrow();
  });

  it('rejects another owner and unregistered namespaces', () => {
    expect(() => assertExecutionLabelsOwnedBy({ 'other.x': 'v' }, 'alertzero', namespaces)).toThrow(
      'owned by "someplugin"'
    );
    expect(() => assertExecutionLabelsOwnedBy({ 'nope.x': 'v' }, 'alertzero', namespaces)).toThrow(
      'not registered'
    );
  });
});

describe('mergeExecutionLabels', () => {
  const immutable = new Set(['hunt.kind']);

  it('overwrites mutable keys and keeps untouched ones', () => {
    expect(
      mergeExecutionLabels(
        { 'hunt.kind': 'manual_session', 'hunt.outcome': 'exploratory' },
        { 'hunt.outcome': 'investigation_created' },
        immutable
      )
    ).toEqual({ 'hunt.kind': 'manual_session', 'hunt.outcome': 'investigation_created' });
  });

  it('rejects changing an immutable key but allows an identical rewrite', () => {
    const existing = { 'hunt.kind': 'manual_session' };
    expect(() =>
      mergeExecutionLabels(existing, { 'hunt.kind': 'library_child' }, immutable)
    ).toThrow('immutable');
    expect(() =>
      mergeExecutionLabels(existing, { 'hunt.kind': 'manual_session' }, immutable)
    ).not.toThrow();
  });

  it('fails closed when the merge exceeds the key bound', () => {
    const existing = Object.fromEntries(
      Array.from({ length: EXECUTION_LABELS_MAX_KEYS }, (_, i) => [`hunt.k${i}`, 'v'])
    );
    expect(() => mergeExecutionLabels(existing, { 'hunt.extra': 'v' })).toThrow('after merge');
  });
});

describe('matchesImmutableIdentity', () => {
  it('requires every identity label to match', () => {
    const identity = { 'hunt.kind': 'library_dispatch', 'hunt.budget_date': '2026-10-30' };
    expect(matchesImmutableIdentity({ ...identity, 'hunt.outcome': 'x' }, identity)).toBe(true);
    expect(matchesImmutableIdentity({ 'hunt.kind': 'library_dispatch' }, identity)).toBe(false);
    expect(matchesImmutableIdentity(undefined, identity)).toBe(false);
  });
});
