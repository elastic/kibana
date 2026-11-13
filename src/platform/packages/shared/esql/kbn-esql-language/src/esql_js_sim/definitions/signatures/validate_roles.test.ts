/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ARGUMENT_ROLES, DEFAULT_EXPRESSION_ROLE, DEFAULT_ROLES } from './argument_roles';
import { ROLE_KINDS, validateArgumentRoles } from './validate_roles';

describe('validateArgumentRoles', () => {
  it('accepts the roles of this package', () => {
    expect(validateArgumentRoles(ARGUMENT_ROLES)).toEqual([]);
    expect(
      validateArgumentRoles({ ...DEFAULT_ROLES, expression: DEFAULT_EXPRESSION_ROLE })
    ).toEqual([]);
  });

  it('accepts the roles after a round trip through JSON', () => {
    expect(validateArgumentRoles(JSON.parse(JSON.stringify(ARGUMENT_ROLES)))).toEqual([]);
  });

  it('has a shape for every kind of role the table uses', () => {
    const used = new Set(Object.values(ARGUMENT_ROLES).map(({ kind }) => kind));

    expect([...used].filter((kind) => !ROLE_KINDS.includes(kind))).toEqual([]);
  });

  it.each([
    ['a role with no kind', { a: {} }, 'a: expected a role with a kind'],
    ['an unknown kind', { a: { kind: 'table' } }, 'a.kind: unknown kind table'],
    ['an unknown field', { a: { kind: 'column', color: 'red' } }, 'a.color: unknown field'],
    ['a missing field', { a: { kind: 'entity' } }, 'a.entityType: missing'],
    [
      'an unknown kind of entity',
      { a: { kind: 'entity', entityType: 'dashboard' } },
      'a.entityType: expected one of',
    ],
    [
      'an unknown expression mode',
      { a: { kind: 'expression', mode: 'fast' } },
      'a.mode: expected one of',
    ],
    [
      'a field of the wrong type',
      { a: { kind: 'column', unique: 'yes' } },
      'a.unique: expected a boolean',
    ],
    [
      'a list with a wrong item',
      { a: { kind: 'column', types: ['text', 1] } },
      'a.types[1]: expected a string',
    ],
    [
      'an unknown field in a map parameter',
      { a: { kind: 'map', parameters: { size: { type: 'integer', unit: 'kb' } } } },
      'a.parameters.size.unit: unknown field',
    ],
    [
      'a wrong role inside a dependent value',
      { a: { kind: 'dependent_value', on: 'b', roles: { index: { kind: 'entity' } } } },
      'a.roles.index.entityType: missing',
    ],
    ['something that is no table', ['column'], 'expected a table of roles by call site'],
  ])('rejects %s', (_name, roles, problem) => {
    expect(validateArgumentRoles(roles)).toEqual([expect.stringContaining(problem)]);
  });

  it('reports every problem, each with where it is', () => {
    const problems = validateArgumentRoles({
      first: { kind: 'column', color: 'red' },
      second: { kind: 'constant', valueType: 'money' },
    });

    expect(problems).toHaveLength(2);
    expect(problems[0]).toMatch(/^first\.color/);
    expect(problems[1]).toMatch(/^second\.valueType/);
  });
});
