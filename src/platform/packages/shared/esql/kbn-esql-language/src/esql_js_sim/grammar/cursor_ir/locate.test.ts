/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { locate } from './locate';
import type { CursorIR } from './types';

const CURSOR = '▮';

/** Locates the cursor at the `▮` mark, or at the end of the text. */
const at = (marked: string): CursorIR => {
  const offset = marked.includes(CURSOR) ? marked.indexOf(CURSOR) : marked.length;

  return locate(marked.replace(CURSOR, ''), offset);
};

/** The distinct outermost call sites of the expected arguments: where each one enters the command. */
const entries = ({ arguments: expected }: CursorIR): string[] =>
  [...new Set(expected.map(({ path }) => path[0]))].sort();

/** The distinct rules of the expected arguments. */
const rules = ({ arguments: expected }: CursorIR): string[] =>
  [...new Set(expected.map(({ rule }) => rule))].sort();

const followerNames = ({ followers }: CursorIR, ...classes: string[]): string[] =>
  followers
    .filter((follower) => !classes.length || classes.includes(follower.class))
    .map(({ token }) => token)
    .sort();

const EXPRESSION_RULES = ['constant', 'functionName', 'qualifiedName'];

describe('locate', () => {
  describe('position', () => {
    it.each([
      ['', 'start_of_query'],
      ['  ', 'start_of_query'],
      ['SET a = 1; ', 'start_of_statement'],
      ['FROM a | ', 'start_of_command'],
      ['FROM a | FORK (', 'start_of_command'],
      ['FROM a | FORK (WHERE b | ', 'start_of_command'],
      ['FROM a | WHERE ', 'start_of_argument'],
      ['FROM a | KEEP a, ', 'start_of_argument'],
      ['FROM a | WHERE a ==', 'start_of_argument'],
      ['FROM a | EVAL x = FN(', 'start_of_argument'],
      ['FROM a | WHERE x ', 'after_argument'],
      ['FROM a | LIMIT 10 ', 'after_argument'],
      ['FROM a | EVAL x = FN(b) ', 'after_argument'],
      ['FROM a | EVAL x = a.', 'inside_argument'],
      ['FROM a | EVAL x = "ab', 'inside_string'],
      ['FROM a | WHERE b == """ab', 'inside_string'],
      ['FROM a // c', 'inside_comment'],
      ['FROM a /* c', 'inside_comment'],
      ['FROM a | KEEP )', 'invalid'],
    ])('%j is %s', (query, position) => {
      expect(at(query).position).toBe(position);
    });

    it('describes the place before a word that is being typed', () => {
      expect(at('FROM a | KEEP b')).toMatchObject({
        position: 'start_of_argument',
        word: { text: 'b', start: 14 },
      });
      expect(at('FROM a | SORT b A')).toMatchObject({
        position: 'after_argument',
        word: { text: 'A', start: 16 },
      });
    });

    it('is the same before the cursor whatever follows it', () => {
      expect(at('FROM a | KEEP ▮ | LIMIT 1').position).toBe('start_of_argument');
      expect(at('FROM a | ▮ | LIMIT 1').position).toBe('start_of_command');
    });
  });

  describe('command', () => {
    it.each([
      ['FROM ', 'fromCommand'],
      ['FROM a | WHERE ', 'whereCommand'],
      ['FROM a | STATS c = AVG(b) BY ', 'statsCommand'],
      ['SET ', 'setCommand'],
      ['FROM a | LOOKUP JOIN b ON ', 'joinCommand'],
    ])('%j is in %s', (query, command) => {
      expect(at(query)).toMatchObject({ command, enclosingCommands: [] });
    });

    it('names the commands around a branch and a subquery', () => {
      expect(at('FROM a | FORK (WHERE ')).toMatchObject({
        command: 'whereCommand',
        enclosingCommands: ['forkCommand'],
      });
      expect(at('FROM a, (FROM ')).toMatchObject({
        command: 'fromCommand',
        enclosingCommands: ['fromCommand'],
      });
    });

    it('has no command where one starts', () => {
      expect(at('').command).toBeUndefined();
      expect(at('FROM a | ').command).toBeUndefined();
    });

    it('bounds the segment to the command', () => {
      expect(at('FROM a | WHERE b ').segment).toEqual({ start: 9, end: 17, text: 'WHERE b ' });
    });
  });

  describe('arguments', () => {
    it('identifies a labelled argument by its label', () => {
      expect(at('FROM a | RENAME b AS ').arguments).toEqual([
        {
          id: 'renameClause.newName',
          rule: 'qualifiedNamePattern',
          path: ['renameCommand>renameClause', 'renameClause.newName'],
          command: 'renameCommand',
          continues: false,
        },
      ]);
      expect(entries(at('FROM a | ENRICH p ON '))).toEqual(['enrichCommand.matchField']);
    });

    it('identifies an unlabelled argument by the rules of its call', () => {
      expect(at('FROM a | KEEP ').arguments).toMatchObject([
        {
          id: 'qualifiedNamePatterns>qualifiedNamePattern',
          path: ['keepCommand>qualifiedNamePatterns', 'qualifiedNamePatterns>qualifiedNamePattern'],
        },
      ]);
    });

    it('tells apart the two expression lists of a command', () => {
      expect(entries(at('FROM a | STATS '))).toEqual(['statsCommand.stats']);
      expect(entries(at('FROM a | STATS c = AVG(b) BY '))).toEqual(['statsCommand.grouping']);
    });

    it('reports an expression by what can start it, under the call that takes it', () => {
      const ir = at('FROM a | WHERE ');

      expect(entries(ir)).toEqual(['whereCommand>booleanExpression']);
      expect(rules(ir)).toEqual(EXPRESSION_RULES);
    });

    it('lists each way to reach an argument once', () => {
      const paths = at('FROM a | WHERE ').arguments.map(({ path }) => path.join('/'));

      expect(new Set(paths).size).toBe(paths.length);
    });

    it('marks an argument the cursor would extend', () => {
      expect(at('FROM a | KEEP b ').arguments).toMatchObject([
        { rule: 'qualifiedNamePattern', continues: true },
      ]);
      expect(at('FROM a | KEEP b, ').arguments).toMatchObject([
        { rule: 'qualifiedNamePattern', continues: false },
      ]);
    });

    it('reports the arguments of a command that Kibana has not registered', () => {
      const ir = at('FROM a | FILLNULL ');

      expect(ir.command).toBe('fillNullCommand');
      expect(entries(ir)).toEqual(['fillNullCommand>fillNullValue']);
      expect(followerNames(ir, 'keyword')).toEqual(['DEFAULT', 'FALSE', 'NULL', 'TRUE']);
      expect(followerNames(at('FROM a | FILLNULL 0 '))).toEqual(['ON']);
    });
  });

  describe('lambda', () => {
    const lambdaPaths = (ir: CursorIR): string[][] =>
      ir.arguments
        .map(({ path }) => path)
        .filter((path) => path.includes('functionExpression>lambda'));

    it('reports the parameter of a lambda as its own argument at a function argument', () => {
      const ir = at('FROM a | EVAL x = FN(');
      const parameter = ir.arguments.find(({ id }) => id === 'lambda>identifier');

      expect(parameter).toMatchObject({ rule: 'identifier', continues: false });
      expect(parameter?.path.slice(-2)).toEqual(['functionExpression>lambda', 'lambda>identifier']);
      // The expression a function argument can also be is reported next to it.
      expect(rules(ir)).toEqual([...EXPRESSION_RULES, 'identifier'].sort());
    });

    it('reports the arrow after a name that can be a parameter', () => {
      expect(at('FROM a | EVAL x = FN(b, v ').followers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ token: 'ARROW', class: 'operator', id: 'lambda>ARROW' }),
        ])
      );
    });

    it('reports the body of a lambda as an expression under the lambda', () => {
      const ir = at('FROM a | EVAL x = FN(b, v -> ');

      expect(rules(ir)).toEqual(EXPRESSION_RULES);
      expect(lambdaPaths(ir)).toHaveLength(ir.arguments.length);
      expect(ir.arguments[0].path).toEqual(
        expect.arrayContaining(['functionExpression>lambda', 'lambda>booleanExpression'])
      );
    });

    it('stays under the lambda inside a body with several parameters', () => {
      const ir = at('FROM a | EVAL x = FN(b, (v, w) -> v + ');

      expect(lambdaPaths(ir)).toHaveLength(ir.arguments.length);
    });
  });

  describe('followers', () => {
    it('classifies tokens without naming them', () => {
      const classes = Object.fromEntries(
        at('FROM a | SORT b ').followers.map((follower) => [follower.token, follower.class])
      );

      expect(classes).toMatchObject({
        ASC: 'keyword',
        NULLS: 'keyword',
        AND: 'operator',
        EQ: 'operator',
        COMMA: 'separator',
        LP: 'opener',
        PIPE: 'pipe',
        EOF: 'end',
      });
    });

    it('classifies a closing bracket, a statement end and a token with no fixed text', () => {
      expect(at('FROM a | EVAL x = FN(b ').followers).toEqual(
        expect.arrayContaining([expect.objectContaining({ token: 'RP', class: 'closer' })])
      );
      expect(at('SET a = 1 ').followers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ token: 'SEMICOLON', class: 'terminator' }),
        ])
      );
      expect(at('FROM a METADATA ').followers).toEqual([
        expect.objectContaining({
          token: 'UNQUOTED_SOURCE',
          class: 'value',
          id: 'metadata>UNQUOTED_SOURCE',
        }),
      ]);
    });

    it('gives the fixed text of a keyword, also of one the grammar defines in several modes', () => {
      const texts = Object.fromEntries(
        at('FROM a | ').followers.map((follower) => [follower.token, follower.text])
      );

      expect(texts).toMatchObject({ WHERE: 'where', STATS: 'stats', MV_EXPAND: 'mv_expand' });
      expect(at('FROM a | INLINE ').followers).toEqual([
        expect.objectContaining({ token: 'INLINE_STATS', class: 'keyword', text: 'stats' }),
      ]);
    });

    it('says which command a command name starts', () => {
      const where = at('FROM a | ').followers.find(({ token }) => token === 'WHERE');

      expect(where).toMatchObject({
        startsCommand: true,
        command: 'whereCommand',
        id: 'whereCommand>WHERE',
        path: [],
      });
      expect(at('FROM a | ').followers.every(({ startsCommand }) => startsCommand)).toBe(true);
    });

    it('tells a command name from the same keyword inside a command', () => {
      const where = at('FROM a | STATS c = AVG(b) ').followers.find(
        ({ token }) => token === 'WHERE'
      );

      expect(where).toMatchObject({
        startsCommand: false,
        command: 'statsCommand',
        class: 'keyword',
      });
    });

    it('offers the header commands only before the query', () => {
      expect(followerNames(at(''))).toEqual(expect.arrayContaining(['FROM', 'SET']));
      expect(followerNames(at('SET a = 1; '))).toEqual(expect.arrayContaining(['FROM', 'SET']));
      expect(followerNames(at('FROM a | '))).not.toContain('SET');
    });

    it('adds the pipe and the end when the command can end', () => {
      expect(at('FROM a | LIMIT 10 ')).toMatchObject({ canEnd: true });
      expect(followerNames(at('FROM a | LIMIT 10 '))).toEqual(['BY', 'EOF', 'PIPE']);
      expect(at('FROM a | LIMIT ')).toMatchObject({ canEnd: false });
    });
  });

  describe('previous token', () => {
    it.each([
      ['FROM a | WHERE ', { token: 'WHERE', class: 'keyword', glued: false }],
      ['FROM a | KEEP b, ', { token: 'COMMA', class: 'separator', glued: false }],
      ['FROM a | KEEP b,', { token: 'COMMA', class: 'separator', glued: true }],
      ['FROM a | EVAL x = FN(', { token: 'LP', class: 'opener', glued: true }],
      ['FROM a | WHERE x ', { token: 'UNQUOTED_IDENTIFIER', class: 'value', glued: false }],
      ['FROM a | ', { token: 'PIPE', class: 'pipe', glued: false }],
    ])('%j', (query, previous) => {
      expect(at(query).previous).toEqual(previous);
    });

    it('is absent at the start of the query', () => {
      expect(at('').previous).toBeUndefined();
    });
  });

  describe('word', () => {
    it('names the expected keyword the word spells in full, in any case', () => {
      expect(at('FROM a | LIMIT 10 by').word).toEqual({ text: 'by', start: 18, keyword: 'BY' });
      expect(at('FROM a | LIMIT 10 B').word).toEqual({ text: 'B', start: 18 });
    });

    it('names no keyword that is not expected there', () => {
      expect(at('FROM a | SORT b AS').word).toEqual({ text: 'AS', start: 16 });
    });
  });
});
