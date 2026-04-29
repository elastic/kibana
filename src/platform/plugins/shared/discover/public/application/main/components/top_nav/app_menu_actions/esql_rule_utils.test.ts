/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQLVariableType, type ESQLControlVariable } from '@kbn/esql-types';
import {
  esqlControlVariableIsComposerInlinable,
  esqlTimeLiteralIsDirectlySubstitutable,
  findUnresolvedVariables,
  inlineEsqlVariables,
} from './esql_rule_utils';

const makeVar = (
  overrides: Partial<ESQLControlVariable> & Pick<ESQLControlVariable, 'type' | 'value'>
): ESQLControlVariable => ({ key: 'p', ...overrides });

// ---------------------------------------------------------------------------
// esqlTimeLiteralIsDirectlySubstitutable
// ---------------------------------------------------------------------------

describe('esqlTimeLiteralIsDirectlySubstitutable', () => {
  it('returns true for TIME_LITERAL with a non-empty string value', () => {
    expect(
      esqlTimeLiteralIsDirectlySubstitutable(
        makeVar({ type: ESQLVariableType.TIME_LITERAL, value: '15m' })
      )
    ).toBe(true);
  });

  it('returns false for TIME_LITERAL with an empty string value', () => {
    expect(
      esqlTimeLiteralIsDirectlySubstitutable(
        makeVar({ type: ESQLVariableType.TIME_LITERAL, value: '' })
      )
    ).toBe(false);
  });

  it('returns false for TIME_LITERAL with a numeric value', () => {
    expect(
      esqlTimeLiteralIsDirectlySubstitutable(
        makeVar({ type: ESQLVariableType.TIME_LITERAL, value: 15 })
      )
    ).toBe(false);
  });

  it('returns false for VALUES type even with a non-empty string', () => {
    expect(
      esqlTimeLiteralIsDirectlySubstitutable(
        makeVar({ type: ESQLVariableType.VALUES, value: '15m' })
      )
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// esqlControlVariableIsComposerInlinable
// ---------------------------------------------------------------------------

describe('esqlControlVariableIsComposerInlinable', () => {
  it('returns false for TIME_LITERAL (Composer would quote the duration)', () => {
    expect(
      esqlControlVariableIsComposerInlinable(
        makeVar({ type: ESQLVariableType.TIME_LITERAL, value: '15m' })
      )
    ).toBe(false);
  });

  it('returns true for VALUES with a string value', () => {
    expect(
      esqlControlVariableIsComposerInlinable(
        makeVar({ type: ESQLVariableType.VALUES, value: 'web-1' })
      )
    ).toBe(true);
  });

  it('returns true for VALUES with a numeric value', () => {
    expect(
      esqlControlVariableIsComposerInlinable(makeVar({ type: ESQLVariableType.VALUES, value: 42 }))
    ).toBe(true);
  });

  it('returns false for VALUES with an array value', () => {
    expect(
      esqlControlVariableIsComposerInlinable(
        makeVar({ type: ESQLVariableType.VALUES, value: ['a', 'b'] })
      )
    ).toBe(false);
  });

  it('returns true for FIELDS with a string value', () => {
    expect(
      esqlControlVariableIsComposerInlinable(
        makeVar({ type: ESQLVariableType.FIELDS, value: 'message' })
      )
    ).toBe(true);
  });

  it('returns true for FUNCTIONS with a string value', () => {
    expect(
      esqlControlVariableIsComposerInlinable(
        makeVar({ type: ESQLVariableType.FUNCTIONS, value: 'COUNT' })
      )
    ).toBe(true);
  });

  it('returns true for non-empty homogeneous string MULTI_VALUES', () => {
    expect(
      esqlControlVariableIsComposerInlinable(
        makeVar({ type: ESQLVariableType.MULTI_VALUES, value: ['prod', 'staging'] })
      )
    ).toBe(true);
  });

  it('returns true for non-empty homogeneous numeric MULTI_VALUES', () => {
    expect(
      esqlControlVariableIsComposerInlinable(
        makeVar({ type: ESQLVariableType.MULTI_VALUES, value: [1, 2, 3] })
      )
    ).toBe(true);
  });

  it('returns false for empty MULTI_VALUES', () => {
    expect(
      esqlControlVariableIsComposerInlinable(
        makeVar({ type: ESQLVariableType.MULTI_VALUES, value: [] })
      )
    ).toBe(false);
  });

  it('returns false for mixed-type MULTI_VALUES', () => {
    expect(
      esqlControlVariableIsComposerInlinable(
        makeVar({ type: ESQLVariableType.MULTI_VALUES, value: ['a', 1] })
      )
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// inlineEsqlVariables
// ---------------------------------------------------------------------------

describe('inlineEsqlVariables', () => {
  const query = 'FROM logs* | WHERE host == ?host | LIMIT 10';

  it('returns the original query when esqlVariables is undefined', () => {
    expect(inlineEsqlVariables(query, undefined)).toBe(query);
  });

  it('returns the original query when esqlVariables is empty', () => {
    expect(inlineEsqlVariables(query, [])).toBe(query);
  });

  it('inlines a VALUES variable via Composer (value is quoted)', () => {
    const result = inlineEsqlVariables(query, [
      makeVar({ key: 'host', type: ESQLVariableType.VALUES, value: 'web-1' }),
    ]);
    expect(result).toContain('"web-1"');
    expect(result).not.toContain('?host');
  });

  it('inlines a TIME_LITERAL variable verbatim (value is NOT quoted)', () => {
    const timeLiteralQuery = 'FROM logs* | WHERE @timestamp > NOW() - ?window | LIMIT 10';
    const result = inlineEsqlVariables(timeLiteralQuery, [
      makeVar({ key: 'window', type: ESQLVariableType.TIME_LITERAL, value: '15m' }),
    ]);
    expect(result).toContain('15m');
    expect(result).not.toContain('"15m"');
    expect(result).not.toContain('?window');
  });

  it('does not replace ??key when substituting a TIME_LITERAL ?key', () => {
    const mixedQuery = 'FROM logs* | KEEP ??window | WHERE @timestamp > NOW() - ?window | LIMIT 10';
    const result = inlineEsqlVariables(mixedQuery, [
      makeVar({ key: 'window', type: ESQLVariableType.TIME_LITERAL, value: '15m' }),
    ]);
    expect(result).toContain('??window');
    expect(result).not.toContain('?window | LIMIT');
  });

  it('falls back to processedQuery (with TIME_LITERAL substitutions) when Composer throws', () => {
    // Deliberately broken ES|QL so Composer will throw
    const brokenQuery = 'NOT VALID ES|QL ?window ?host';
    const result = inlineEsqlVariables(brokenQuery, [
      makeVar({ key: 'window', type: ESQLVariableType.TIME_LITERAL, value: '15m' }),
      makeVar({ key: 'host', type: ESQLVariableType.VALUES, value: 'web-1' }),
    ]);
    // TIME_LITERAL substitution was applied before Composer was invoked
    expect(result).toContain('15m');
    expect(result).not.toContain('?window');
  });
});

// ---------------------------------------------------------------------------
// findUnresolvedVariables
// ---------------------------------------------------------------------------

describe('findUnresolvedVariables', () => {
  it('returns [] when the query has no placeholders', () => {
    expect(findUnresolvedVariables('FROM logs* | LIMIT 10', [])).toEqual([]);
  });

  it('returns [] when all ?param placeholders are resolved', () => {
    expect(
      findUnresolvedVariables('FROM logs* | WHERE host == ?host | LIMIT 10', [
        makeVar({ key: 'host', type: ESQLVariableType.VALUES, value: 'web-1' }),
      ])
    ).toEqual([]);
  });

  it('returns the unresolved token when no matching control exists', () => {
    expect(
      findUnresolvedVariables('FROM logs* | WHERE @timestamp > NOW() - ?new | LIMIT 20', [
        makeVar({ key: 'mytest', type: ESQLVariableType.TIME_LITERAL, value: '15m' }),
      ])
    ).toEqual(['?new']);
  });

  it('returns [] for a TIME_LITERAL control with a valid value', () => {
    expect(
      findUnresolvedVariables('FROM logs* | WHERE @timestamp > NOW() - ?window | LIMIT 10', [
        makeVar({ key: 'window', type: ESQLVariableType.TIME_LITERAL, value: '15m' }),
      ])
    ).toEqual([]);
  });

  it('returns the token for a TIME_LITERAL control with an empty value', () => {
    expect(
      findUnresolvedVariables('FROM logs* | WHERE @timestamp > NOW() - ?window | LIMIT 10', [
        makeVar({ key: 'window', type: ESQLVariableType.TIME_LITERAL, value: '' }),
      ])
    ).toEqual(['?window']);
  });

  it('returns only the unresolved token when one of two params is missing', () => {
    expect(
      findUnresolvedVariables('FROM logs* | WHERE host == ?host AND env == ?env | LIMIT 10', [
        makeVar({ key: 'host', type: ESQLVariableType.VALUES, value: 'web-1' }),
      ])
    ).toEqual(['?env']);
  });

  it('returns the token for an empty MULTI_VALUES control', () => {
    expect(
      findUnresolvedVariables('FROM logs* | WHERE env IN (?envs) | LIMIT 10', [
        makeVar({ key: 'envs', type: ESQLVariableType.MULTI_VALUES, value: [] }),
      ])
    ).toEqual(['?envs']);
  });

  it('preserves the ?? prefix for identifier placeholders with no matching control', () => {
    expect(findUnresolvedVariables('FROM logs* | KEEP ??col | LIMIT 10', [])).toEqual(['??col']);
  });
});
