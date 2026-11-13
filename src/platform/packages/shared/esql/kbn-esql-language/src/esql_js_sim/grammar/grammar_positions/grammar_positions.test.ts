/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EXPRESSION_POSITIONS,
  getCommandStarts,
  getGrammarPositions,
  withoutRecursion,
  type GrammarPosition,
} from './grammar_positions';

const positions = getGrammarPositions();

const of = (command: string): GrammarPosition[] =>
  positions.filter((position) => position.command === command);

const pathsOf = (command: string): string[] => of(command).map(({ path }) => path.join(' / '));

describe('getGrammarPositions', () => {
  it('lists the arguments of a command with their paths', () => {
    expect(of('renameCommand')).toEqual([
      {
        command: 'renameCommand',
        path: ['renameCommand>renameClause', 'renameClause.oldName'],
        id: 'renameClause.oldName',
        kind: 'argument',
        takes: 'qualifiedNamePattern',
      },
      {
        command: 'renameCommand',
        path: ['renameCommand>renameClause', 'renameClause.newName'],
        id: 'renameClause.newName',
        kind: 'argument',
        takes: 'qualifiedNamePattern',
      },
    ]);
  });

  it('lists an expression as one position and does not go into it', () => {
    expect(of('whereCommand')).toEqual([
      {
        command: 'whereCommand',
        path: ['whereCommand>booleanExpression'],
        id: 'whereCommand>booleanExpression',
        kind: 'expression',
        takes: 'booleanExpression',
      },
    ]);
  });

  it('tells the two expression lists of a command apart', () => {
    expect(pathsOf('statsCommand')).toEqual(
      expect.arrayContaining([
        'statsCommand.stats / aggFields>aggField / aggField>field / field>booleanExpression',
        'statsCommand.grouping / fields>field / field>booleanExpression',
      ])
    );
  });

  it('lists a token with no fixed text that a rule takes directly', () => {
    expect(of('fromCommand')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'metadata>UNQUOTED_SOURCE',
          kind: 'value_token',
          takes: 'UNQUOTED_SOURCE',
        }),
      ])
    );
    expect(pathsOf('letCommand')).toEqual([
      'letCommand>letBinding / letBinding>UNQUOTED_IDENTIFIER',
    ]);
  });

  it('gives two commands that share a rule the same positions under their own name', () => {
    const withoutCommand = (command: string) =>
      pathsOf(command).map((path) => path.replace(command, ''));

    expect(withoutCommand('timeSeriesCommand')).toEqual(withoutCommand('fromCommand'));
  });

  it('lists what an expression contains once, with the parameter of a lambda', () => {
    expect(of(EXPRESSION_POSITIONS).map(({ id }) => id)).toEqual(
      expect.arrayContaining([
        'primaryExpression>qualifiedName',
        'primaryExpression>constant',
        'functionExpression>functionName',
        'lambda>identifier',
      ])
    );
    expect(of(EXPRESSION_POSITIONS).every(({ path }) => path.length === 1)).toBe(true);
  });

  it('does not take a pipeline or a branch for an expression', () => {
    expect(
      positions.filter(({ takes }) => ['query', 'forkSubQueryCommand'].includes(takes))
    ).toEqual([]);
    // The commands of a branch have their own positions; the branch itself takes none.
    expect(of('forkCommand')).toEqual([]);
  });

  it('lists a command that Kibana has not registered', () => {
    expect(pathsOf('fillNullCommand')).toEqual(
      expect.arrayContaining([
        'fillNullCommand>fillNullValue / fillNullValue>integerValue',
        'fillNullCommand>qualifiedNamePatterns / qualifiedNamePatterns>qualifiedNamePattern',
      ])
    );
  });

  it('lists each position once', () => {
    const keys = positions.map(({ command, path }) => `${command}|${path.join('/')}`);

    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('getCommandStarts', () => {
  const starts = getCommandStarts();

  it('gives the token that starts a command, with its text', () => {
    expect(starts.whereCommand).toEqual([{ token: 'WHERE', text: 'where' }]);
    expect(starts.timeSeriesCommand).toEqual([{ token: 'TS', text: 'ts' }]);
  });

  it('gives every token of a command that starts in several ways', () => {
    expect(starts.joinCommand.map(({ text }) => text)).toEqual(
      expect.arrayContaining(['lookup', 'left', 'right'])
    );
    expect(starts.inlineStatsCommand.map(({ text }) => text).sort()).toEqual([
      'inline',
      'inlinestats',
    ]);
  });

  it('has a start for every command of the grammar', () => {
    expect(Object.values(starts).every((tokens) => tokens.length > 0)).toBe(true);
  });
});

describe('withoutRecursion', () => {
  it('leaves a path with no repeat alone', () => {
    const path = ['renameCommand>renameClause', 'renameClause.newName'];

    expect(withoutRecursion(path)).toEqual(path);
  });

  it('folds a rule that contains itself to the path the table lists', () => {
    const nestedMapKey = [
      'fuseCommand>fuseConfiguration',
      'fuseConfiguration.options',
      'mapExpression>entryExpression',
      'entryExpression.value',
      'mapValue>mapExpression',
      'mapExpression>entryExpression',
      'entryExpression.key',
    ];

    expect(withoutRecursion(nestedMapKey)).toEqual([
      'fuseCommand>fuseConfiguration',
      'fuseConfiguration.options',
      'mapExpression>entryExpression',
      'entryExpression.key',
    ]);
    expect(pathsOf('fuseCommand')).toContain(withoutRecursion(nestedMapKey).join(' / '));
  });

  it('folds any number of levels', () => {
    expect(withoutRecursion(['a>b', 'b>b', 'b>b', 'b>c'])).toEqual(['a>b', 'b>c']);
  });
});
