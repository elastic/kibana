/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from '@elastic/esql';
import { Token } from 'antlr4';
import { getTokenName, getTokenType, locateCursor } from './cursor_location';

const { symbolicNames } = Parser.create('').parser;

/** Locates the cursor at the end of `text`. */
const locate = (text: string) => locateCursor(text, text.length);

const tokenNames = (text: string) =>
  [...locate(text).expectedTokens]
    .map((type) => (type === Token.EOF ? 'EOF' : symbolicNames[type]))
    .sort();

/** The rules expected at the end of `text`; a rule reached by several call paths is listed once. */
const ruleNames = (text: string) => [
  ...new Set(
    locate(text)
      .expectedRules.map(({ rule }) => rule)
      .sort()
  ),
];

const EXPRESSION_RULES = ['constant', 'functionName', 'qualifiedName'];

describe('locateCursor', () => {
  describe('expected tokens and rules', () => {
    it.each([
      [' FROM a | ENRICH  ', ['enrichPolicyName']],
      [' FROM a | KEEP x,  ', ['qualifiedNamePattern']],
      [' FROM a | LIMIT  ', ['constant']],
      [' FROM a | WHERE msg == "a | b" AND  ', EXPRESSION_RULES],
      ['FROM a // x | y\n | LIMIT  ', ['constant']],
      [' FROM a | FORK (WHERE x | SORT y) (WHERE  ', EXPRESSION_RULES],
      [' FROM a, (FROM b | KEEP  ', ['qualifiedNamePattern']],
    ])('returns the slots at %j', (text, rules) => {
      expect(ruleNames(text)).toEqual(rules);
    });

    it('returns the ENRICH keywords and the pipe after the policy name', () => {
      expect(tokenNames(' FROM a | ENRICH pol  ')).toEqual(['EOF', 'ON', 'PIPE', 'WITH']);
    });

    it('returns exactly AS and = after a RENAME column', () => {
      expect(tokenNames(' FROM a | RENAME x  ')).toEqual(['AS', 'ASSIGN']);
    });

    it('returns BY and the pipe after a LIMIT value', () => {
      expect(tokenNames(' FROM a | LIMIT 10  ')).toEqual(['BY', 'EOF', 'PIPE']);
    });

    it('returns the tokens after the first command', () => {
      expect(tokenNames(' FROM a  ')).toEqual(['COMMA', 'EOF', 'METADATA', 'PIPE']);
    });

    it('keeps the pipe inside a string out of the anchoring', () => {
      const { ruleStack } = locate(' FROM a | WHERE msg == "a | b" AND  ');

      expect(ruleStack.slice(0, 2)).toEqual(['processingCommand', 'whereCommand']);
    });

    it('treats lowercase keywords like uppercase ones', () => {
      expect(ruleNames(' from a | where  ')).toEqual(ruleNames(' FROM a | WHERE  '));
      expect(tokenNames(' from a | enrich pol  ')).toEqual(tokenNames(' FROM a | ENRICH pol  '));
    });
  });

  describe('ruleStack', () => {
    it('names the command at the cursor', () => {
      expect(locate(' FROM a | ENRICH pol  ').ruleStack).toEqual([
        'processingCommand',
        'enrichCommand',
      ]);
    });

    it('contains forkSubQuery inside a FORK branch', () => {
      expect(locate(' FROM a | FORK (WHERE x | SORT y) (WHERE  ').ruleStack).toEqual(
        expect.arrayContaining(['forkCommand', 'forkSubQuery', 'whereCommand'])
      );
    });

    it('contains subquery inside a FROM subquery', () => {
      expect(locate(' FROM a, (FROM b | KEEP  ').ruleStack).toEqual(
        expect.arrayContaining(['subquery', 'processingCommand', 'keepCommand'])
      );
    });
  });

  describe('tokenStacks', () => {
    it('names the rules above each expected token', () => {
      const { tokenStacks } = locate(' FROM a | SORT b  ');

      expect(tokenStacks.get(getTokenType('ASC'))).toMatchObject({
        rules: ['processingCommand', 'sortCommand', 'orderExpression'],
        startsCommand: false,
      });
    });

    it('names the command of a token inside a FORK branch, where the shared stack does not', () => {
      const { ruleStack, tokenStacks } = locate(' FROM a | FORK (SORT b  ');

      expect(ruleStack).not.toContain('sortCommand');
      expect(tokenStacks.get(getTokenType('ASC'))?.rules).toEqual(
        expect.arrayContaining(['forkCommand', 'sortCommand'])
      );
    });

    it('tells a command name from the same keyword inside a command', () => {
      const where = getTokenType('WHERE');

      expect(locate(' FROM a | ').tokenStacks.get(where)?.startsCommand).toBe(true);
      expect(locate(' FROM a | FORK (').tokenStacks.get(where)?.startsCommand).toBe(true);
      expect(locate(' FROM a | STATS c = COUNT(*)  ').tokenStacks.get(where)?.startsCommand).toBe(
        false
      );
    });

    it('has no stack for the tokens added because the command can end', () => {
      const { tokenStacks } = locate(' FROM a | LIMIT 10  ');

      expect(tokenStacks.has(getTokenType('PIPE'))).toBe(false);
      expect(tokenStacks.has(getTokenType('BY'))).toBe(true);
    });
  });

  describe('commandCanEnd', () => {
    it.each([
      [' FROM a | ENRICH pol  ', true],
      [' FROM a | ENRICH pol ON x  ', true],
      [' FROM a | SORT b  ', true],
      [' FROM a | STATS c = COUNT(*)  ', true],
      ['FROM employees | SAMPLE 0.05 ', true],
      [' FROM a  ', true],
      [' FROM a | RENAME x  ', false],
      [' FROM a | LIMIT  ', false],
      [' FROM a | KEEP x,  ', false],
      [' FROM a | WHERE x > 1 AND  ', false],
    ])('is %j -> %s', (text, expected) => {
      const { commandCanEnd, expectedTokens } = locate(text);
      const pipe = symbolicNames.indexOf('PIPE');

      expect(commandCanEnd).toBe(expected);
      expect(expectedTokens.has(pipe)).toBe(expected);
    });

    it('offers RP instead of EOF when a nested command can end', () => {
      expect(tokenNames(' FROM a, (FROM b | KEEP x  ')).toEqual(
        expect.arrayContaining(['PIPE', 'RP'])
      );
    });
  });

  describe('segment', () => {
    it.each([
      [' FROM a | ENRICH pol  ', 'ENRICH pol  '],
      [' FROM a  ', 'FROM a  '],
      [' FROM a, (FROM b | KEEP  ', 'KEEP  '],
      [' FROM a | FORK (WHERE x | SORT y) (WHERE  ', 'WHERE  '],
      ['FROM a | LIM', 'LIM'],
      ['FROM a | ', ''],
      ['SET a = 1; FROM b | LIMIT ', 'LIMIT '],
    ])('at %j is %j', (text, segmentText) => {
      const { segment } = locate(text);

      expect(segment).toEqual({
        start: text.length - segmentText.length,
        end: text.length,
        text: segmentText,
      });
    });

    it('is the command at the cursor in multi-line input, not the last one', () => {
      const text = 'FROM a\n| EVAL x = \n| WHERE b > 1';
      const offset = text.indexOf('= ') + 2;
      const { segment, ruleStack } = locateCursor(text, offset);

      expect(segment.text).toBe('EVAL x = ');
      expect(ruleStack.slice(0, 2)).toEqual(['processingCommand', 'evalCommand']);
    });
  });

  describe('partial', () => {
    it('is the word being typed', () => {
      const { partial } = locate('FROM a | LIM');

      expect(partial).toEqual({ text: 'LIM', start: 9 });
      expect(tokenNames('FROM a | LIM')).toEqual(expect.arrayContaining(['LIMIT']));
    });

    it('is undefined after whitespace', () => {
      expect(locate('FROM a | LIMIT ').partial).toBeUndefined();
    });

    it.each([
      ['FROM a | KEEP `my fi', '`my fi', ['qualifiedNamePattern']],
      ['FROM a | EVAL x = "ab', '"ab', EXPRESSION_RULES],
    ])('covers the unterminated quote in %j', (text, partialText, rules) => {
      expect(locate(text).partial).toEqual({
        text: partialText,
        start: text.length - partialText.length,
      });
      expect(ruleNames(text)).toEqual(rules);
    });
  });

  describe('a dot after whitespace', () => {
    it('is the start of a decimal being typed', () => {
      const { partial, expectedRules } = locate(' FROM a | SAMPLE .');

      expect(partial).toEqual({ text: '.', start: 17 });
      expect(expectedRules.map(({ rule }) => rule)).toEqual(['constant']);
    });

    it('still continues a dotted name without whitespace', () => {
      expect(locate(' FROM a | KEEP a.').partial).toBeUndefined();
    });
  });

  describe('a source name', () => {
    it.each([
      ['FROM logs-', 'logs-'],
      ['FROM logs-*', 'logs-*'],
      ['FROM a, -', '-'],
    ])('is the word being typed in %j however it ends', (text, partialText) => {
      const { partial, expectedRules } = locate(text);

      expect(partial).toEqual({ text: partialText, start: text.length - partialText.length });
      expect(expectedRules.map(({ rule }) => rule)).toContain('indexPattern');
    });
  });

  describe('inComment', () => {
    it.each([
      ['FROM a // note', true],
      ['FROM a /* note', true],
      ['FROM a | WHERE x /* note', true],
      ['FROM a // note\n', false],
      ['FROM a /* note */ ', false],
    ])('is %j -> %s', (text, expected) => {
      expect(locate(text).inComment).toBe(expected);
    });

    it('collects no candidates inside a comment', () => {
      const { expectedTokens, expectedRules } = locate('FROM a // note');

      expect(expectedTokens.size).toBe(0);
      expect(expectedRules).toEqual([]);
    });
  });

  describe('continuation', () => {
    it.each([
      ['FROM a | WHERE @timestamp > NOW() - 1 ', 'constant', true],
      [' FROM a  ', 'indexPattern', true],
      [' FROM a | KEEP x,  ', 'qualifiedNamePattern', false],
      ['FROM a | WHERE ms', 'qualifiedName', false],
    ])('at %j marks %s as %s', (text, rule, expected) => {
      const expectedRule = locate(text).expectedRules.find((candidate) => candidate.rule === rule);

      expect(expectedRule?.continuation).toBe(expected);
    });

    it.each([
      ['FROM a | RENAME a.b ', 'a.b'],
      ['FROM a | RENAME `my field` ', '`my field`'],
      ['FROM a | RENAME x /* note */ ', 'x'],
    ])('at %j has the typed text %j', (text, slotText) => {
      const expectedRule = locate(text).expectedRules.find(({ continuation }) => continuation);

      expect(expectedRule?.text).toBe(slotText);
    });

    it('has no text for a slot that starts at the cursor', () => {
      const [expectedRule] = locate(' FROM a | KEEP x,  ').expectedRules;

      expect(expectedRule.text).toBe('');
    });
  });

  describe('startsRules', () => {
    const startsRules = (text: string, rule: string) =>
      locate(text).expectedRules.find((candidate) => candidate.rule === rule)?.startsRules;

    it('counts the enclosing rules that start with the slot', () => {
      // `primaryExpression`, then `functionExpression` too for a function name.
      expect(startsRules('FROM a | DISSECT ', 'qualifiedName')).toBe(1);
      expect(startsRules('FROM a | DISSECT ', 'functionName')).toBe(2);
    });

    it('stops at a rule that started before the slot', () => {
      expect(startsRules('FROM a | KEEP ', 'qualifiedNamePattern')).toBe(1);
      expect(startsRules('FROM a | KEEP a, ', 'qualifiedNamePattern')).toBe(0);
    });
  });

  describe('previousTokenType', () => {
    it.each([
      ['FROM a | RENAME x AS ', 'AS'],
      ['FROM a | RENAME x /* note */ = ', 'ASSIGN'],
      ['FROM a | KEEP x, y', 'COMMA'],
      ['FROM a | ', 'PIPE'],
    ])('at %j is %s', (text, tokenName) => {
      expect(locate(text).previousTokenType).toBe(getTokenType(tokenName));
    });

    it('is undefined at the start of the query', () => {
      expect(locate('').previousTokenType).toBeUndefined();
    });
  });

  describe('characters the lexer drops', () => {
    it('keeps them in the word they directly follow', () => {
      const { partial, expectedRules } = locate('FROM a | ENRICH _any:');

      expect(partial).toEqual({ text: '_any:', start: 16 });
      expect(expectedRules.map(({ rule }) => rule)).toEqual(['enrichPolicyName']);
    });

    it('reports them as skipped text between the previous token and the cursor', () => {
      expect(locate('FROM a | ENRICH _any: ').skippedText).toBe(':');
      expect(locate('FROM a | ENRICH _any ').skippedText).toBe('');
    });
  });

  describe('whitespaceBefore', () => {
    it.each([
      ['FROM a | KEEP x, ', true],
      ['FROM a | KEEP x,', false],
      ['FROM a | KEEP x, y', true],
      ['FROM a | KEEP x,y', false],
      ['FROM a | KEEP x,/* c */', true],
    ])('at %j is %s', (text, expected) => {
      expect(locate(text).whitespaceBefore).toBe(expected);
    });
  });

  describe('slot previousTokenType', () => {
    it('is the token before the slot, also when the cursor continues the slot', () => {
      const [slot] = locate(' FROM a | RENAME a AS b.').expectedRules;

      expect(slot.continuation).toBe(true);
      expect(slot.previousTokenType).toBe(getTokenType('AS'));
      expect(locate(' FROM a | RENAME ').expectedRules[0].previousTokenType).toBe(
        getTokenType('RENAME')
      );
    });
  });

  describe('invokingStates', () => {
    const callStates = (text: string) =>
      locate(text).expectedRules.map(({ invokingStates }) => invokingStates?.at(-1));

    it('tells calls of the same rule after the same token apart', () => {
      const [scoreBy] = callStates('FROM a | FUSE SCORE BY ');
      const [groupBy] = callStates('FROM a | FUSE GROUP BY ');

      expect(scoreBy).toEqual(expect.any(Number));
      expect(groupBy).toEqual(expect.any(Number));
      expect(scoreBy).not.toBe(groupBy);
    });

    // Both RENAME forms start with a name; each call is a slot of its own.
    it.each(['FROM a | RENAME ', 'FROM a | RENAME kubernetes.'])(
      'reports each call of a rule at %j',
      (text) => {
        expect(new Set(callStates(text)).size).toBe(2);
      }
    );
  });

  describe('lexer modes', () => {
    // WITH leaves the FUSE lexer mode, where `group` would be a name, not a keyword.
    it('leaves out keywords the lexer cannot produce at the cursor', () => {
      expect(tokenNames('FROM a | FUSE SCORE BY x ')).toEqual(
        expect.arrayContaining(['GROUP', 'KEY', 'WITH'])
      );
      expect(tokenNames('FROM a | FUSE WITH { "rank_constant": 60 } ')).not.toEqual(
        expect.arrayContaining(['GROUP'])
      );
    });

    it('reads the modes where the word being typed starts', () => {
      expect(tokenNames('FROM a | FUSE SCORE BY x WIT')).toContain('WITH');
    });
  });

  describe('getTokenName', () => {
    it('names token types', () => {
      expect(getTokenName(getTokenType('AS'))).toBe('AS');
      expect(getTokenName(Token.EOF)).toBe('EOF');
    });
  });

  describe('getTokenType', () => {
    it('returns the grammar token type for a name', () => {
      expect(getTokenType('PIPE')).toBe(symbolicNames.indexOf('PIPE'));
      expect(getTokenType('EOF')).toBe(Token.EOF);
    });
  });
});
