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
      expect(at('FROM a | LIMIT 10 by').word).toMatchObject({
        text: 'by',
        start: 18,
        keyword: 'BY',
      });
      expect(at('FROM a | LIMIT 10 B').word?.keyword).toBeUndefined();
    });

    it('names no keyword that is not expected there', () => {
      expect(at('FROM a | SORT b AS').word).toMatchObject({ text: 'AS', start: 16 });
      expect(at('FROM a | SORT b AS').word?.keyword).toBeUndefined();
    });

    it.each([
      ['FROM a | KEEP b', 'b', 'name'],
      ['FROM a | KEEP lo*', 'lo*', 'pattern'],
      ['FROM logs-', 'logs-', 'name'],
      ['FROM a | KEEP `b c`', '`b c`', 'quoted_name'],
      ['FROM a | LIMIT 10', '10', 'number'],
      ['FROM a | WHERE b == "x"', '"x"', 'string'],
      ['FROM a | WHERE b == "x', '"x', 'string'],
    ])('%j is typing %j, a %s', (query, text, kind) => {
      expect(at(query).word).toMatchObject({ text, kind });
    });

    it('says whether the lexer reads the word as a whole token', () => {
      expect(at('FROM a | WHERE b == "x"')).toMatchObject({
        position: 'start_of_argument',
        word: { complete: true },
      });
      expect(at('FROM a | WHERE b == "x')).toMatchObject({
        position: 'inside_string',
        word: { complete: false },
      });
      expect(at('FROM a | KEEP `b c')).toMatchObject({ word: { complete: false } });
    });

    it('gives the whole argument a glued word continues', () => {
      expect(at('FROM a | EVAL x = a.b').word).toMatchObject({
        text: 'b',
        argument: { text: 'a.b', start: 18 },
      });
      expect(at('FROM cl:idx').word).toMatchObject({
        text: 'idx',
        argument: { text: 'cl:idx', start: 5 },
      });
    });

    it('does not join a word to an argument it is not glued to', () => {
      expect(at('FROM a | LIMIT 10 by').word?.argument).toBeUndefined();
      expect(at('FROM a | KEEP b').word?.argument).toBeUndefined();
    });
  });

  describe('next token', () => {
    it.each([
      ['FROM a | WHERE b IN (1, ▮)', { token: 'RP', class: 'closer' }],
      ['SET a = 1▮;', { token: 'SEMICOLON', class: 'terminator' }],
      ['FROM a | LIMIT ▮ | KEEP b', { token: 'PIPE', class: 'pipe' }],
      ['FROM a | KEEP ▮b', { token: 'ID_PATTERN', class: 'value' }],
    ])('%j', (query, next) => {
      expect(at(query).next).toEqual(next);
    });

    it('is absent at the end of the query', () => {
      expect(at('FROM a | LIMIT ').next).toBeUndefined();
      expect(at('FROM a | LIMIT ▮  ').next).toBeUndefined();
    });
  });

  describe('only follower', () => {
    it('names the token when nothing else can come next', () => {
      expect(at('FROM a | FILLNULL 0 ').onlyFollower).toBe('ON');
      expect(at('FROM a | DISSECT b "p" APPEND_SEPARATOR ').onlyFollower).toBe('ASSIGN');
      expect(at('FROM a METADATA ').onlyFollower).toBe('UNQUOTED_SOURCE');
    });

    it('is absent when an argument or several tokens can come next', () => {
      expect(at('FROM a | KEEP ').onlyFollower).toBeUndefined();
      expect(at('FROM a | LIMIT 10 ').onlyFollower).toBeUndefined();
    });
  });

  describe('written arguments', () => {
    const texts = (ir: CursorIR, id: string): string[] =>
      ir.written.filter((argument) => argument.id === id).map(({ text }) => text);

    it('lists what is written in the command before the cursor', () => {
      const ir = at('FROM a | ENRICH p ON f WITH x = y, ');

      expect(texts(ir, 'enrichCommand.policyName')).toEqual(['p']);
      expect(texts(ir, 'enrichCommand.matchField')).toEqual(['f']);
      expect(texts(ir, 'enrichWithClause.newName')).toEqual(['x']);
    });

    it('uses the call sites of the expected arguments', () => {
      const ir = at('FROM a | KEEP b, c, ');

      expect(texts(ir, ir.arguments[0].id)).toEqual(['b', 'c']);
    });

    it('leaves the word being typed out', () => {
      expect(texts(at('FROM a | KEEP b, c'), 'qualifiedNamePatterns>qualifiedNamePattern')).toEqual(
        ['b']
      );
    });

    it('leaves what follows the cursor out', () => {
      expect(
        texts(at('FROM a | KEEP b, ▮, d'), 'qualifiedNamePatterns>qualifiedNamePattern')
      ).toEqual(['b']);
    });

    it('is the innermost command only', () => {
      const ir = at('FROM a | FORK (WHERE b | KEEP c, ');

      expect(ir.written.map(({ text }) => text)).toEqual(['KEEP', 'c', ',']);
    });

    it('is empty where a command starts', () => {
      expect(at('FROM a | ').written).toEqual([]);
      expect(at('').written).toEqual([]);
    });

    it('keeps what was written when the command is unfinished', () => {
      const ir = at('FROM a | EVAL x = 1, y = FN(b, ');

      expect(texts(ir, 'field>qualifiedName')).toEqual(['x', 'y']);
      expect(texts(ir, 'functionExpression>functionName')).toEqual(['FN']);
      expect(ir.written.some(({ text }) => text.includes('esql_cursor_marker'))).toBe(false);
    });

    it('marks the argument the cursor is in as open, with its text so far', () => {
      expect(at('FROM a | EVAL x = a.b').written.at(-1)).toMatchObject({
        rule: 'qualifiedName',
        text: 'a.',
        open: true,
      });
      expect(at('FROM a | KEEP b, ').written.some(({ open }) => open)).toBe(false);
    });

    it('says which places above an argument the cursor is still in', () => {
      const openIds = (ir: CursorIR): string[] =>
        (ir.written.at(-1)?.ancestors ?? []).filter(({ open }) => open).map(({ id }) => id);

      expect(openIds(at('FROM a | EVAL x = FN(b, '))).toContain(
        'primaryExpression>functionExpression'
      );
      expect(openIds(at('FROM a | EVAL x = FN(b) '))).toEqual([]);
    });

    describe('lambda', () => {
      const parameters = (ir: CursorIR): Array<[string, boolean | undefined]> =>
        ir.written
          .filter(({ id }) => id === 'lambda>identifier')
          .map(({ text, ancestors }) => [text, ancestors.at(-1)?.open]);

      it('reports the parameters of the lambda the cursor is in as in scope', () => {
        expect(parameters(at('FROM a | EVAL x = FN(b, v -> '))).toEqual([['v', true]]);
        expect(parameters(at('FROM a | EVAL x = FN(b, (v, w) -> v + '))).toEqual([
          ['v', true],
          ['w', true],
        ]);
        expect(parameters(at('FROM a | EVAL x = FN(b, v -> v'))).toEqual([['v', true]]);
      });

      it('reports the parameters of a closed lambda as out of scope', () => {
        expect(parameters(at('FROM a | EVAL x = FN(b, v -> v + 1) + '))).toEqual([['v', false]]);
      });
    });
  });
});
