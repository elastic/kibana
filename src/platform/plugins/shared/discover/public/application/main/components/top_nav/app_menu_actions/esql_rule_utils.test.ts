/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esql } from '@elastic/esql';
import { ESQLVariableType, type ESQLControlVariable } from '@kbn/esql-types';
import {
  esqlControlVariableIsComposerInlinable,
  esqlTimeLiteralIsDirectlySubstitutable,
  inlineEsqlVariables,
} from './esql_rule_utils';

jest.mock('@elastic/esql', () => {
  const actual = jest.requireActual('@elastic/esql');
  return { ...actual, esql: jest.fn(actual.esql) };
});

const esqlMock = esql as jest.MockedFunction<typeof esql>;

const makeVar = (
  overrides: Partial<ESQLControlVariable> & Pick<ESQLControlVariable, 'type' | 'value'>
): ESQLControlVariable => ({ key: 'p', ...overrides });

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

describe('inlineEsqlVariables', () => {
  beforeEach(() => {
    esqlMock.mockClear();
  });

  describe('substitution', () => {
    const query = 'FROM logs* | WHERE host == ?host | LIMIT 10';

    it('returns the original query unchanged when esqlVariables is undefined', () => {
      const result = inlineEsqlVariables(query, undefined);
      expect(result.query).toBe(query);
      expect(result.unresolved).toEqual(['?host']);
    });

    it('returns the original query unchanged when esqlVariables is empty', () => {
      const result = inlineEsqlVariables(query, []);
      expect(result.query).toBe(query);
      expect(result.unresolved).toEqual(['?host']);
    });

    it('inlines a VALUES variable via Composer (value is quoted)', () => {
      const result = inlineEsqlVariables(query, [
        makeVar({ key: 'host', type: ESQLVariableType.VALUES, value: 'web-1' }),
      ]);
      expect(result.query).toContain('"web-1"');
      expect(result.query).not.toContain('?host');
      expect(result.unresolved).toEqual([]);
    });

    it('inlines a TIME_LITERAL variable verbatim (value is NOT quoted)', () => {
      const timeLiteralQuery = 'FROM logs* | WHERE @timestamp > NOW() - ?window | LIMIT 10';
      const result = inlineEsqlVariables(timeLiteralQuery, [
        makeVar({ key: 'window', type: ESQLVariableType.TIME_LITERAL, value: '15m' }),
      ]);
      expect(result.query).toContain('15m');
      expect(result.query).not.toContain('"15m"');
      expect(result.query).not.toContain('?window');
      expect(result.unresolved).toEqual([]);
    });

    it('does not replace ??key when substituting a TIME_LITERAL ?key', () => {
      const mixedQuery =
        'FROM logs* | KEEP ??window | WHERE @timestamp > NOW() - ?window | LIMIT 10';
      const result = inlineEsqlVariables(mixedQuery, [
        makeVar({ key: 'window', type: ESQLVariableType.TIME_LITERAL, value: '15m' }),
      ]);
      expect(result.query).toContain('??window');
      expect(result.query).not.toContain('?window | LIMIT');
      // ??window is left over because TIME_LITERAL is not Composer-inlinable as
      // an identifier — surfaced as unresolved.
      expect(result.unresolved).toEqual(['??window']);
    });

    it('warns and falls back when Composer throws, surfacing leftover tokens as unresolved', () => {
      // Force Composer to throw deterministically rather than relying on a
      // specific malformed input string — that way this test keeps covering
      // the catch path even if Composer's parser becomes more lenient.
      esqlMock.mockImplementationOnce(() => {
        throw new Error('forced Composer failure');
      });

      const result = inlineEsqlVariables('FROM logs* | WHERE host == ?host - ?window | LIMIT 5', [
        makeVar({ key: 'window', type: ESQLVariableType.TIME_LITERAL, value: '15m' }),
        makeVar({ key: 'host', type: ESQLVariableType.VALUES, value: 'web-1' }),
      ]);
      // TIME_LITERAL substitution was applied before Composer was invoked.
      expect(result.query).toContain('15m');
      expect(result.query).not.toContain('?window');
      // ?host survives the catch fallback — must be reported as unresolved so
      // the caller blocks save instead of persisting a raw placeholder.
      expect(result.unresolved).toEqual(['?host']);
    });
  });

  describe('unresolved residual scan', () => {
    it('returns no tokens when the query has no placeholders', () => {
      const result = inlineEsqlVariables('FROM logs* | LIMIT 10', []);
      expect(result.unresolved).toEqual([]);
    });

    it('returns no tokens when all ?param placeholders resolve via Composer', () => {
      const result = inlineEsqlVariables('FROM logs* | WHERE host == ?host | LIMIT 10', [
        makeVar({ key: 'host', type: ESQLVariableType.VALUES, value: 'web-1' }),
      ]);
      expect(result.unresolved).toEqual([]);
    });

    it('reports the unresolved token when no matching control exists', () => {
      const result = inlineEsqlVariables(
        'FROM logs* | WHERE @timestamp > NOW() - ?new | LIMIT 20',
        [makeVar({ key: 'mytest', type: ESQLVariableType.TIME_LITERAL, value: '15m' })]
      );
      expect(result.unresolved).toEqual(['?new']);
    });

    it('returns no tokens for a TIME_LITERAL control with a valid value', () => {
      const result = inlineEsqlVariables(
        'FROM logs* | WHERE @timestamp > NOW() - ?window | LIMIT 10',
        [makeVar({ key: 'window', type: ESQLVariableType.TIME_LITERAL, value: '15m' })]
      );
      expect(result.unresolved).toEqual([]);
    });

    it('reports the token for a TIME_LITERAL control with an empty value', () => {
      const result = inlineEsqlVariables(
        'FROM logs* | WHERE @timestamp > NOW() - ?window | LIMIT 10',
        [makeVar({ key: 'window', type: ESQLVariableType.TIME_LITERAL, value: '' })]
      );
      expect(result.unresolved).toEqual(['?window']);
    });

    it('reports only the unresolved token when one of two params is missing', () => {
      const result = inlineEsqlVariables(
        'FROM logs* | WHERE host == ?host AND env == ?env | LIMIT 10',
        [makeVar({ key: 'host', type: ESQLVariableType.VALUES, value: 'web-1' })]
      );
      expect(result.unresolved).toEqual(['?env']);
    });

    it('reports the token for an empty MULTI_VALUES control', () => {
      const result = inlineEsqlVariables('FROM logs* | WHERE env IN (?envs) | LIMIT 10', [
        makeVar({ key: 'envs', type: ESQLVariableType.MULTI_VALUES, value: [] }),
      ]);
      expect(result.unresolved).toEqual(['?envs']);
    });

    it('preserves the ?? prefix for identifier placeholders with no matching control', () => {
      const result = inlineEsqlVariables('FROM logs* | KEEP ??col | LIMIT 10', []);
      expect(result.unresolved).toEqual(['??col']);
    });
  });

  describe('shape gating (token vs control type)', () => {
    it('inlines `??col` against a FIELDS control as an unquoted identifier', () => {
      const result = inlineEsqlVariables('FROM logs* | KEEP ??col | LIMIT 5', [
        makeVar({ key: 'col', type: ESQLVariableType.FIELDS, value: 'message' }),
      ]);
      expect(result.query).toContain('message');
      expect(result.query).not.toContain('"message"');
      expect(result.query).not.toContain('??col');
      expect(result.unresolved).toEqual([]);
    });

    it('refuses `?col` against a FIELDS control (would be quoted as a string)', () => {
      const result = inlineEsqlVariables('FROM logs* | WHERE ?col IS NOT NULL | LIMIT 5', [
        makeVar({ key: 'col', type: ESQLVariableType.FIELDS, value: 'message' }),
      ]);
      expect(result.query).toContain('?col');
      expect(result.query).not.toContain('"message"');
      expect(result.unresolved).toEqual(['?col']);
    });

    it('refuses `?fn` against a FUNCTIONS control (would be quoted as a string)', () => {
      const result = inlineEsqlVariables('FROM logs* | STATS ?fn(bytes) | LIMIT 5', [
        makeVar({ key: 'fn', type: ESQLVariableType.FUNCTIONS, value: 'COUNT' }),
      ]);
      expect(result.query).toContain('?fn');
      expect(result.query).not.toContain('"COUNT"');
      expect(result.unresolved).toEqual(['?fn']);
    });

    it('refuses `??host` against a VALUES control (would emit an unquoted identifier)', () => {
      const result = inlineEsqlVariables('FROM logs* | WHERE host == ??host | LIMIT 5', [
        makeVar({ key: 'host', type: ESQLVariableType.VALUES, value: 'web-1' }),
      ]);
      expect(result.query).toContain('??host');
      expect(result.unresolved).toEqual(['??host']);
    });

    it('refuses `??envs` against a MULTI_VALUES control', () => {
      const result = inlineEsqlVariables('FROM logs* | WHERE env IN (??envs) | LIMIT 5', [
        makeVar({
          key: 'envs',
          type: ESQLVariableType.MULTI_VALUES,
          value: ['prod', 'staging'],
        }),
      ]);
      expect(result.query).toContain('??envs');
      expect(result.unresolved).toEqual(['??envs']);
    });

    it('flags both shapes as unresolved when the same name appears in both forms', () => {
      const result = inlineEsqlVariables(
        'FROM logs* | KEEP ??col | WHERE ?col IS NOT NULL | LIMIT 5',
        [makeVar({ key: 'col', type: ESQLVariableType.FIELDS, value: 'message' })]
      );
      // Ambiguous: include in params would substitute the wrong-shape token too.
      // Refusing leaves both placeholders for the residual scan.
      expect(result.query).toContain('??col');
      expect(result.query).toContain('?col');
      expect(result.unresolved).toEqual(expect.arrayContaining(['?col', '??col']));
      expect(result.unresolved).toHaveLength(2);
    });
  });
});
