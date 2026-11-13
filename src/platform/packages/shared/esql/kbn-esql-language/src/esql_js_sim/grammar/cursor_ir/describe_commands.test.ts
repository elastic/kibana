/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { describeCommands } from './describe_commands';
import type { WrittenArgument, WrittenCommand } from './types';

const commandOf = (text: string, rule: string): WrittenCommand => {
  const command = describeCommands(text).find((candidate) => candidate.rule === rule);

  if (!command) {
    throw new Error(`No ${rule} in ${text}`);
  }

  return command;
};

/** The written arguments a call site took, as their texts. */
const textsAt = ({ arguments: written }: WrittenCommand, id: string): string[] =>
  written.filter((argument) => argument.id === id).map(({ text }) => text);

const pathOf = ({ ancestors, id }: WrittenArgument): string[] => [
  ...ancestors.map((ancestor) => ancestor.id),
  id,
];

describe('describeCommands', () => {
  it('lists the commands of a query with their ranges', () => {
    expect(
      describeCommands('FROM a | WHERE b | KEEP c').map(({ rule, start, end }) => [
        rule,
        start,
        end,
      ])
    ).toEqual([
      ['fromCommand', 0, 6],
      ['whereCommand', 9, 16],
      ['keepCommand', 19, 25],
    ]);
  });

  it('gives a nested command its own arguments and the commands around it', () => {
    const commands = describeCommands('FROM a | FORK (WHERE b) (LIMIT 1) | KEEP c');

    expect(commands.map(({ rule, enclosingCommands }) => [rule, enclosingCommands])).toEqual([
      ['fromCommand', []],
      ['forkCommand', []],
      ['whereCommand', ['forkCommand']],
      ['limitCommand', ['forkCommand']],
      ['keepCommand', []],
    ]);
    expect(commands[1].arguments.map(({ text }) => text)).toEqual(['FORK', '(', ')', '(', ')']);
    expect(commands[2].arguments.map(({ text }) => text)).toEqual(['WHERE', 'b']);
  });

  it('identifies a written argument by the same call site as an expected one', () => {
    const enrich = commandOf('FROM a | ENRICH p ON f WITH x = y', 'enrichCommand');

    expect(textsAt(enrich, 'enrichCommand.policyName')).toEqual(['p']);
    expect(textsAt(enrich, 'enrichCommand.matchField')).toEqual(['f']);
    expect(textsAt(enrich, 'enrichWithClause.newName')).toEqual(['x']);
    expect(textsAt(enrich, 'enrichWithClause.enrichField')).toEqual(['y']);
  });

  it('gives each argument its text, range and rule', () => {
    const [, pattern] = commandOf('FROM a | KEEP b*', 'keepCommand').arguments;

    expect(pattern).toMatchObject({
      id: 'qualifiedNamePatterns>qualifiedNamePattern',
      kind: 'rule',
      rule: 'qualifiedNamePattern',
      text: 'b*',
      start: 14,
      end: 16,
      complete: true,
    });
  });

  it('numbers the items of a list', () => {
    const keep = commandOf('FROM a | KEEP b, c, d', 'keepCommand');
    const items = keep.arguments.filter(({ kind }) => kind === 'rule');

    expect(items.map(({ text, index }) => [text, index])).toEqual([
      ['b', 0],
      ['c', 1],
      ['d', 2],
    ]);
  });

  it('numbers the repetitions of a clause above an argument', () => {
    const fuse = commandOf('FROM a | FUSE linear SCORE BY x KEY BY y', 'fuseCommand');
    const clauseIndex = (id: string) =>
      fuse.arguments.find((argument) => argument.id === id)?.ancestors[0].index;

    expect(textsAt(fuse, 'fuseCommand.fuseType')).toEqual(['linear']);
    expect(clauseIndex('fuseConfiguration.score')).toBe(0);
    expect(clauseIndex('fuseConfiguration>KEY')).toBe(1);
  });

  it('reports the tokens of a command with their class', () => {
    const from = commandOf('FROM a METADATA _id, _index', 'fromCommand');
    const tokens = from.arguments.filter(({ kind }) => kind === 'token');

    expect(tokens.map(({ token, class: tokenClass, text }) => [token, tokenClass, text])).toEqual([
      ['FROM', 'keyword', 'FROM'],
      ['METADATA', 'keyword', 'METADATA'],
      ['UNQUOTED_SOURCE', 'value', '_id'],
      ['COMMA', 'separator', ','],
      ['UNQUOTED_SOURCE', 'value', '_index'],
    ]);
    expect(textsAt(from, 'metadata>UNQUOTED_SOURCE')).toEqual(['_id', '_index']);
  });

  it('tells the two expression lists of a command apart', () => {
    const stats = commandOf('FROM a | STATS c = AVG(b) BY d', 'statsCommand');
    const under = (id: string) =>
      stats.arguments
        .filter(({ ancestors }) => ancestors[0]?.id === id)
        .filter(({ kind }) => kind === 'rule')
        .map(({ text }) => text);

    expect(under('statsCommand.stats')).toEqual(['c', 'AVG', 'b']);
    expect(under('statsCommand.grouping')).toEqual(['d']);
  });

  it('reports the parameters and the body of a lambda under the lambda', () => {
    const evalCommand = commandOf('FROM a | EVAL x = FN(b, (v, w) -> v + w)', 'evalCommand');
    const parameters = evalCommand.arguments.filter(({ id }) => id === 'lambda>identifier');
    const lambda = parameters[0].ancestors.at(-1);

    expect(parameters.map(({ text, index }) => [text, index])).toEqual([
      ['v', 0],
      ['w', 1],
    ]);
    expect(lambda).toMatchObject({ id: 'functionExpression>lambda', start: 24, end: 39 });
    expect(
      evalCommand.arguments
        .filter((argument) => pathOf(argument).includes('lambda>booleanExpression'))
        .filter(({ kind }) => kind === 'rule')
        .map(({ text }) => text)
    ).toEqual(['v', 'w']);
  });

  it('describes a command that Kibana has not registered', () => {
    const fillNull = commandOf('FROM a | FILLNULL 0 ON b, c*', 'fillNullCommand');

    expect(fillNull.arguments.map(({ text }) => text)).toEqual([
      'FILLNULL',
      '0',
      'ON',
      'b',
      ',',
      'c*',
    ]);
  });

  it('needs no cursor and never throws on an unfinished query', () => {
    for (const text of ['', 'FROM', 'FROM a | ', 'FROM a | WHERE b ==', 'FROM a | EVAL x = FN(']) {
      expect(() => describeCommands(text)).not.toThrow();
    }
  });
});
