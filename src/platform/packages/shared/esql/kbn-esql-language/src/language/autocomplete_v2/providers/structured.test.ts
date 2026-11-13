/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  DependentValueRole,
  OptionNameRole,
  ResolvedRole,
} from '../../../esql_js_sim/definitions';
import { locate, type WrittenArgument } from '../../../esql_js_sim/grammar';
import type { SuggestionContext } from '../types';
import { dependentRoles, provideOptionNames } from './structured';

// The options of a time range, as a signature would list them.
const options: OptionNameRole = {
  kind: 'option_name',
  options: {
    index: {},
    time: { conflictsWith: ['step', 'start'] },
    step: { conflictsWith: ['time'] },
    start: { conflictsWith: ['time'], requires: ['end'] },
    end: {},
  },
};

const OPTION_SITE = 'renameClause.oldName';
const resolved: ResolvedRole = {
  role: options,
  id: OPTION_SITE,
  source: 'signature',
  enclosing: [],
};

const written = (id: string, text: string): WrittenArgument => ({
  id,
  kind: 'rule',
  rule: 'identifier',
  text,
  start: 0,
  end: text.length,
  index: 0,
  ancestors: [],
  complete: true,
});

/** A context where the given arguments are written; nothing else of it is read here. */
const contextWith = (...args: WrittenArgument[]): SuggestionContext => {
  const ir = { ...locate('', 0), written: args };

  return {
    ir,
    afterName: ir,
    callbacks: undefined,
    getColumnsByType: async () => [],
    usedNames: new Set(),
    hasLicense: undefined,
    activeProduct: undefined,
    precedingCommands: [],
    sourceIsTimeSeries: false,
    queryContainsSubqueries: false,
  };
};

const optionTexts = (...used: string[]): string[] =>
  provideOptionNames(
    options,
    resolved,
    contextWith(...used.map((name) => written(OPTION_SITE, name)))
  ).map(({ text }) => text);

describe('provideOptionNames', () => {
  it('offers every option with its assignment', () => {
    expect(optionTexts()).toEqual(['index = ', 'time = ', 'step = ', 'start = ', 'end = ']);
  });

  it('leaves out an option that is used, in any case', () => {
    expect(optionTexts('INDEX')).toEqual(['time = ', 'step = ', 'start = ', 'end = ']);
  });

  it('leaves out the options an option that is used conflicts with', () => {
    expect(optionTexts('time')).toEqual(['index = ', 'end = ']);
  });

  it('leaves out an option that conflicts with one that is used', () => {
    expect(optionTexts('step')).toEqual(['index = ', 'start = ', 'end = ']);
  });
});

describe('dependentRoles', () => {
  const NAME_SITE = 'setField>identifier';
  const byName: DependentValueRole = {
    kind: 'dependent_value',
    on: NAME_SITE,
    roles: {
      index: { kind: 'entity', entityType: 'source', indexMode: 'time_series' },
      step: { kind: 'constant', valueType: 'duration' },
    },
  };

  it('gives the role listed for the name that is written', () => {
    expect(dependentRoles(byName, contextWith(written(NAME_SITE, 'step')))).toEqual([
      { kind: 'constant', valueType: 'duration' },
    ]);
    expect(dependentRoles(byName, contextWith(written(NAME_SITE, 'INDEX')))).toEqual([
      { kind: 'entity', entityType: 'source', indexMode: 'time_series' },
    ]);
  });

  it('gives nothing for a name with no role, or when no name is written', () => {
    expect(dependentRoles(byName, contextWith(written(NAME_SITE, 'other')))).toEqual([]);
    expect(dependentRoles(byName, contextWith())).toEqual([]);
  });

  it('gives the roles the named entity defines', () => {
    const bySetting: DependentValueRole = {
      kind: 'dependent_value',
      on: NAME_SITE,
      definedBy: 'setting',
    };
    const roles = dependentRoles(bySetting, contextWith(written(NAME_SITE, 'approximation')));

    expect(roles.map(({ kind }) => kind).sort()).toEqual(['constant', 'map']);
  });
});
