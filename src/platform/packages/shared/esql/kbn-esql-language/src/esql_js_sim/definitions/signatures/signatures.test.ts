/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EXPRESSION_POSITIONS, getCommandStarts, getGrammarPositions } from '../../grammar';
import { ARGUMENT_ROLES, DEFAULT_ROLES } from './argument_roles';
import { COMMAND_FACTS, UNDESCRIBED_COMMANDS } from './command_facts';
import { EXPRESSION_PARTS } from './expression_parts';
import { resolveRole } from './resolve_role';
import type { ArgumentRole, CallSiteId } from './types';

const positions = getGrammarPositions();
const commandPositions = positions.filter(({ command }) => command !== EXPRESSION_POSITIONS);
const commandRules = Object.keys(getCommandStarts());

// Every call site that is on the way to a position of a command.
const callSites = new Set(commandPositions.flatMap(({ path }) => path));

/** The call sites a role refers to, with what refers to them. */
const referencesOf = (role: ArgumentRole): CallSiteId[] => {
  switch (role.kind) {
    case 'column':
      return role.matches ? [role.matches.argument] : [];
    case 'entity':
      return role.dependsOn ? [role.dependsOn] : [];
    case 'expression':
      return role.columnsOf ? [role.columnsOf] : [];
    case 'dependent_value':
      return [role.on, ...Object.values(role.roles ?? {}).flatMap(referencesOf)];
    case 'map':
      return Object.values(role.parameters).flatMap(({ when }) => Object.keys(when ?? {}));
    default:
      return [];
  }
};

const unresolved = (command: string): string[] =>
  commandPositions
    .filter((position) => position.command === command)
    .filter(({ path, takes }) => resolveRole(path, takes)?.source !== 'signature')
    .map(({ path }) => path.join(' / '));

describe('the argument roles', () => {
  it('are declared on call sites the grammar has', () => {
    expect(Object.keys(ARGUMENT_ROLES).filter((id) => !callSites.has(id))).toEqual([]);
  });

  it('refer only to call sites that have a role', () => {
    const dangling = Object.entries(ARGUMENT_ROLES).flatMap(([id, role]) =>
      referencesOf(role)
        .filter((reference) => !ARGUMENT_ROLES[reference])
        .map((reference) => `${id} -> ${reference}`)
    );

    expect(dangling).toEqual([]);
  });

  it('give every option of an option list a known conflict or requirement', () => {
    const unknown = Object.entries(ARGUMENT_ROLES).flatMap(([id, role]) =>
      role.kind === 'option_name'
        ? Object.entries(role.options).flatMap(([name, { conflictsWith = [], requires = [] }]) =>
            [...conflictsWith, ...requires]
              .filter((other) => !(other in role.options))
              .map((other) => `${id}: ${name} -> ${other}`)
          )
        : []
    );

    expect(unknown).toEqual([]);
  });

  it('give a value that depends on an option a role for each option', () => {
    const missing = Object.entries(ARGUMENT_ROLES).flatMap(([id, role]) => {
      if (role.kind !== 'dependent_value' || !role.roles) {
        return [];
      }

      const options = ARGUMENT_ROLES[role.on];
      const names = options.kind === 'option_name' ? Object.keys(options.options) : [];

      return names.filter((name) => !role.roles?.[name]).map((name) => `${id}: ${name}`);
    });

    expect(missing).toEqual([]);
  });

  it('cover every position of every described command', () => {
    const uncovered = Object.fromEntries(
      commandRules
        .filter((command) => !(command in UNDESCRIBED_COMMANDS))
        .map((command) => [command, unresolved(command)] as const)
        .filter(([, paths]) => paths.length > 0)
    );

    expect(uncovered).toEqual({});
  });

  it('list as undescribed only commands that the grammar has and that lack a role somewhere', () => {
    const stale = Object.keys(UNDESCRIBED_COMMANDS).filter(
      (command) => !commandRules.includes(command) || unresolved(command).length === 0
    );

    // A command with no position at all needs no description to be complete.
    const withoutPositions = Object.keys(UNDESCRIBED_COMMANDS).filter(
      (command) => !commandPositions.some((position) => position.command === command)
    );

    expect(stale.filter((command) => !withoutPositions.includes(command))).toEqual([]);
  });
});

describe('the expression parts', () => {
  it('describe exactly the places an expression has', () => {
    const places = positions
      .filter(({ command }) => command === EXPRESSION_POSITIONS)
      .map(({ id }) => id)
      .sort();

    expect(Object.keys(EXPRESSION_PARTS).sort()).toEqual(places);
  });

  it('scope the parameter of a lambda to its lambda', () => {
    expect(EXPRESSION_PARTS['lambda>identifier']).toEqual({
      part: 'new_name',
      of: 'lambda_parameter',
      scope: 'functionExpression>lambda',
    });
  });
});

describe('the command facts', () => {
  it('are about commands the grammar has', () => {
    expect(Object.keys(COMMAND_FACTS).filter((command) => !commandRules.includes(command))).toEqual(
      []
    );
  });

  it('name single-use clauses the grammar has', () => {
    const unknown = Object.values(COMMAND_FACTS)
      .flatMap(({ singleUse = [] }) => singleUse)
      .filter((id) => !callSites.has(id));

    expect(unknown).toEqual([]);
  });
});

describe('resolveRole', () => {
  it('gives the role declared on the place', () => {
    expect(resolveRole(['renameCommand>renameClause', 'renameClause.newName'])).toEqual({
      role: { kind: 'new_name', of: 'column' },
      id: 'renameClause.newName',
      source: 'signature',
      enclosing: [],
    });
  });

  it('gives a place with no role of its own the role declared above it', () => {
    const column = resolveRole([
      'keepCommand>qualifiedNamePatterns',
      'qualifiedNamePatterns>qualifiedNamePattern',
    ]);

    expect(column).toMatchObject({
      role: { kind: 'column', wildcard: 'pattern', unique: true },
      id: 'keepCommand>qualifiedNamePatterns',
    });
  });

  it('prefers the innermost role on the path', () => {
    const filter = resolveRole([
      'statsCommand.stats',
      'aggFields>aggField',
      'aggField>booleanExpression',
    ]);
    const aggregation = resolveRole([
      'statsCommand.stats',
      'aggFields>aggField',
      'aggField>field',
      'field>booleanExpression',
    ]);
    const newColumn = resolveRole([
      'statsCommand.stats',
      'aggFields>aggField',
      'aggField>field',
      'field>qualifiedName',
    ]);

    expect(filter?.role).toMatchObject({ kind: 'expression', mode: 'filter' });
    expect(aggregation?.role).toMatchObject({ kind: 'expression', mode: 'aggregation' });
    expect(newColumn?.role).toEqual({ kind: 'new_name', of: 'column' });
  });

  it('applies the role of an expression to the places inside it', () => {
    const insideWhere = resolveRole([
      'whereCommand>booleanExpression',
      'booleanExpression>valueExpression',
      'valueExpression>operatorExpression',
      'operatorExpression>primaryExpression',
      'primaryExpression>qualifiedName',
    ]);

    expect(insideWhere).toMatchObject({
      role: { kind: 'expression', mode: 'filter', completeAs: 'boolean' },
      id: 'whereCommand>booleanExpression',
    });
  });

  describe('inheritance', () => {
    const source = (command: string) =>
      resolveRole([
        `${command}>indexPatternAndMetadataFields`,
        'indexPatternAndMetadataFields>indexPatternOrSubquery',
        'indexPatternOrSubquery>indexPattern',
      ]);

    it('lets a source take what its list says about sources', () => {
      expect(source('fromCommand')?.role).toEqual({
        kind: 'entity',
        entityType: 'source',
        unique: true,
        subqueries: true,
      });
      expect(source('timeSeriesCommand')?.role).toEqual({
        kind: 'entity',
        entityType: 'source',
        unique: true,
        indexMode: 'time_series',
      });
    });

    it('keeps the roles above the place', () => {
      expect(source('fromCommand')?.enclosing.map(({ id }) => id)).toEqual([
        'fromCommand>indexPatternAndMetadataFields',
      ]);
    });

    it('does not pass the facts of one kind of thing to another', () => {
      const metadataField = resolveRole([
        'fromCommand>indexPatternAndMetadataFields',
        'indexPatternAndMetadataFields>metadata',
        'metadata>UNQUOTED_SOURCE',
      ]);

      expect(metadataField?.role).toEqual({
        kind: 'entity',
        entityType: 'metadata_field',
        unique: true,
      });
    });
  });

  it('folds a map inside a map to the same role', () => {
    const key = ['mapExpression>entryExpression', 'entryExpression.key'];
    const nested = resolveRole([
      'fuseCommand>fuseConfiguration',
      'fuseConfiguration.options',
      'mapExpression>entryExpression',
      'entryExpression.value',
      'mapValue>mapExpression',
      ...key,
    ]);

    expect(nested).toMatchObject({ role: { kind: 'map' }, id: 'fuseConfiguration.options' });
  });

  describe('a command with no signature', () => {
    it('gets the default role of the rule', () => {
      expect(
        resolveRole(
          ['fillNullCommand>qualifiedNamePatterns', 'qualifiedNamePatterns>qualifiedNamePattern'],
          'qualifiedNamePattern'
        )
      ).toEqual({ role: DEFAULT_ROLES.qualifiedNamePattern, source: 'default', enclosing: [] });
      expect(
        resolveRole(['fillNullCommand>fillNullValue', 'fillNullValue>integerValue'], 'integerValue')
          ?.role
      ).toEqual({ kind: 'constant', valueType: 'integer' });
    });

    it('gets a scalar expression where the grammar takes an expression', () => {
      // A field list under a command no signature knows: the call into the expression is one
      // the table of positions has, and nothing on the path declares a role.
      const insideUnknownList = [
        'unknownCommand>fields',
        'fields>field',
        'field>booleanExpression',
        'booleanExpression>valueExpression',
        'primaryExpression>qualifiedName',
      ];

      expect(resolveRole(insideUnknownList, 'qualifiedName')).toEqual({
        role: { kind: 'expression', mode: 'scalar' },
        source: 'default',
        enclosing: [],
      });
    });

    it('gets nothing where neither a signature nor a default applies', () => {
      expect(resolveRole(['unknownCommand>somethingElse'], 'identifier')).toBeUndefined();
    });
  });
});
