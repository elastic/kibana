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
  it('splits a query into commands and keeps each as written, with its offsets', () => {
    const query =
      'FROM logstash-*\n  | STATS requests = COUNT(*) BY clientip, machine.os\n  | SORT requests DESC';

    const commands = splitQueryCommands(query);

    expect(commands.map(({ name, text }) => ({ name, text }))).toEqual([
      { name: 'FROM', text: 'FROM logstash-*' },
      { name: 'STATS', text: 'STATS requests = COUNT(*) BY clientip, machine.os' },
      { name: 'SORT', text: 'SORT requests DESC' },
    ]);
    commands.forEach(({ text, start, end }) => {
      expect(query.slice(start, end)).toBe(text);
    });
  });

  it('does not split on pipes inside strings, brackets or comments', () => {
    const commands = splitQueryCommands(
      'FROM a // not | a split\n| WHERE x == "a|b" AND y IN (1, 2)\n| /* | */ EVAL z = CONCAT("|", `we|ird`)'
    );

    expect(commands.map(({ name }) => name)).toEqual(['FROM', 'WHERE', 'EVAL']);
    expect(commands[1].text).toBe('WHERE x == "a|b" AND y IN (1, 2)');
  });

  it('names a command that starts with a comment, and keeps offsets exact', () => {
    const query = 'FROM a\n| /* keep it */ KEEP b';

    const [, keep] = splitQueryCommands(query);

    expect(keep.name).toBe('KEEP');
    expect(query.slice(keep.start, keep.end)).toBe('/* keep it */ KEEP b');
  });

  it('handles escaped quotes and subqueries in parentheses', () => {
    const commands = splitQueryCommands('FROM (FROM a | LIMIT 1), b | WHERE s == "say \\"|\\""');

    expect(commands.map(({ name }) => name)).toEqual(['FROM', 'WHERE']);
  });

  it('upper cases the command name and ignores an empty query', () => {
    expect(splitQueryCommands('from logs | where x > 1').map(({ name }) => name)).toEqual([
      'FROM',
      'WHERE',
    ]);
    expect(splitQueryCommands('   ')).toEqual([]);
  });
});

describe('splitQueryCommands branches', () => {
  const query = [
    'FROM',
    '  (FROM logs | WHERE a == 1 | STATS c = COUNT(*) BY a),',
    '  (FROM logs | STATS c = COUNT(*) BY a)',
    '| SORT c DESC',
  ].join('\n');

  it('gives a FROM with subqueries their commands, with offsets into the whole query', () => {
    const [from, sort] = splitQueryCommands(query);

    expect(sort.name).toBe('SORT');
    expect(from.branches).toHaveLength(2);
    expect(from.branches?.map((branch) => branch.map(({ name }) => name))).toEqual([
      ['FROM', 'WHERE', 'STATS'],
      ['FROM', 'STATS'],
    ]);
    from.branches?.flat().forEach(({ text, start, end }) => {
      expect(query.slice(start, end)).toBe(text);
    });
    expect(from.branches?.[0][1].text).toBe('WHERE a == 1');
  });

  it('has no branches for a plain query, or for parentheses that are not subqueries of FROM', () => {
    expect(splitQueryCommands('FROM logs | WHERE (a > 1 OR b > 2)')[1].branches).toBeUndefined();
    expect(splitQueryCommands('FROM logs')[0].branches).toBeUndefined();
    expect(splitQueryCommands('FROM a, b METADATA _id')[0].branches).toBeUndefined();
  });

  it('gives the branches of a FORK, and only looks one level deep', () => {
    const fork = 'FROM logs | FORK (WHERE a > 1 | LIMIT 2) (WHERE a < 1) | SORT a';
    const [, forkCommand] = splitQueryCommands(fork);

    expect(forkCommand.name).toBe('FORK');
    expect(forkCommand.branches?.map((branch) => branch.map(({ name }) => name))).toEqual([
      ['WHERE', 'LIMIT'],
      ['WHERE'],
    ]);

    const nested = splitQueryCommands('FROM (FROM (FROM a | LIMIT 1) | STATS c = COUNT(*))');
    expect(nested[0].branches?.[0].map(({ name }) => name)).toEqual(['FROM', 'STATS']);
    expect(nested[0].branches?.[0][0].branches).toBeUndefined();
  });

  it('ignores pipes and parentheses inside strings in a subquery', () => {
    const [from] = splitQueryCommands('FROM (FROM a | WHERE s == "x|(y") | LIMIT 1');

    expect(from.branches?.[0].map(({ name }) => name)).toEqual(['FROM', 'WHERE']);
  });
});
