/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { splitQueryCommands } from './query_commands';

describe('splitQueryCommands', () => {
  it('splits a query into commands, each as written, with its name in upper case', () => {
    const commands = splitQueryCommands(
      'from logstash-*\n  | STATS requests = COUNT(*) BY clientip, machine.os\n  | SORT requests DESC'
    );

    expect(commands.map(({ name, text }) => ({ name, text }))).toEqual([
      { name: 'FROM', text: 'from logstash-*' },
      { name: 'STATS', text: 'STATS requests = COUNT(*) BY clientip, machine.os' },
      { name: 'SORT', text: 'SORT requests DESC' },
    ]);
  });

  it('does not split on pipes inside strings or comments', () => {
    const commands = splitQueryCommands(
      'FROM a // not | a split\n| WHERE x == "a|b" AND y IN (1, 2)\n| /* | */ EVAL z = CONCAT("|", `we|ird`)'
    );

    expect(commands.map(({ name }) => name)).toEqual(['FROM', 'WHERE', 'EVAL']);
    expect(commands[1].text).toBe('WHERE x == "a|b" AND y IN (1, 2)');
  });

  it('tells where each command is in the query', () => {
    const query = 'FROM a\n| WHERE b > 1 // c\n| LIMIT 5';
    const commands = splitQueryCommands(query);

    expect(commands.map(({ start, end }) => query.slice(start, end))).toEqual([
      'FROM a',
      'WHERE b > 1',
      'LIMIT 5',
    ]);
  });

  it('has no commands for an empty query', () => {
    expect(splitQueryCommands('   ')).toEqual([]);
  });
});

describe('splitQueryCommands branches', () => {
  const branchNames = (command: { branches?: Array<Array<{ name: string }>> }) =>
    command.branches?.map((branch) => branch.map(({ name }) => name));

  it('gives a FROM with subqueries the commands of each', () => {
    const [from, sort] = splitQueryCommands(
      [
        'FROM',
        '  (FROM logs | WHERE a == 1 | STATS c = COUNT(*) BY a),',
        '  (FROM logs | STATS c = COUNT(*) BY a)',
        '| SORT c DESC',
      ].join('\n')
    );

    expect(sort.name).toBe('SORT');
    expect(branchNames(from)).toEqual([
      ['FROM', 'WHERE', 'STATS'],
      ['FROM', 'STATS'],
    ]);
    expect(from.branches?.[0][1].text).toBe('WHERE a == 1');
  });

  it('has no branches for a plain query, or for parentheses that are not subqueries of a FROM', () => {
    expect(splitQueryCommands('FROM logs | WHERE (a > 1 OR b > 2)')[1].branches).toBeUndefined();
    expect(splitQueryCommands('FROM logs')[0].branches).toBeUndefined();
    expect(splitQueryCommands('FROM a, b METADATA _id')[0].branches).toBeUndefined();
  });

  it('gives the branches of a FORK, and only looks one level deep', () => {
    const [, fork] = splitQueryCommands('FROM logs | FORK (WHERE a > 1 | LIMIT 2) (WHERE a < 1)');

    expect(fork.name).toBe('FORK');
    expect(branchNames(fork)).toEqual([['WHERE', 'LIMIT'], ['WHERE']]);

    const [nested] = splitQueryCommands('FROM (FROM (FROM a | LIMIT 1) | STATS c = COUNT(*))');
    expect(branchNames(nested)).toEqual([['FROM', 'STATS']]);
    expect(nested.branches?.[0][0].branches).toBeUndefined();
  });
});
