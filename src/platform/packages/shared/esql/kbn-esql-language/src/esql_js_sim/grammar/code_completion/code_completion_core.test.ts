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
import { CodeCompletionCore, type CollectionStart } from './code_completion_core';

const PREFERRED_RULES = [
  'qualifiedName',
  'qualifiedNamePattern',
  'enrichPolicyName',
  'indexPattern',
  'functionName',
  'constant',
  'parameter',
  'identifierPattern',
] as const;

interface CollectOptions {
  /** Start at `processingCommand` right after the last pipe instead of at the query start. */
  fromLastPipe?: boolean;
  ignoredTokens?: string[];
}

const setup = (text: string) => {
  const parseResult = Parser.create(text);
  parseResult.tokens.fill();
  return parseResult;
};

const collect = (
  text: string,
  { fromLastPipe = false, ignoredTokens = [] }: CollectOptions = {}
) => {
  const { parser, tokens } = setup(text);
  const { ruleNames, symbolicNames } = parser;
  const allTokens = tokens.tokens;
  // Every text ends at the cursor, so the caret token is the trailing EOF.
  const caretTokenIndex = allTokens[allTokens.length - 1].tokenIndex;

  const core = new CodeCompletionCore(parser, tokens);
  core.preferredRules = new Set(PREFERRED_RULES.map((rule) => ruleNames.indexOf(rule)));
  core.ignoredTokens = new Set(ignoredTokens.map((name) => symbolicNames.indexOf(name)));

  let start: CollectionStart | undefined;
  if (fromLastPipe) {
    const pipeIndex = allTokens.findLastIndex(({ type }) => symbolicNames[type] === 'PIPE');
    start = { ruleIndex: ruleNames.indexOf('processingCommand'), start: allTokens[pipeIndex + 1] };
  }

  const candidates = core.collectCandidates(caretTokenIndex, start);
  const tokenName = (type: number) => (type === Token.EOF ? 'EOF' : symbolicNames[type]);

  return {
    tokens: [...candidates.tokens.keys()].map(tokenName).sort(),
    following: new Map(
      [...candidates.tokens].map(([type, following]) => [tokenName(type), following.map(tokenName)])
    ),
    rules: [...candidates.rules].flatMap(([ruleIndex, entries]) =>
      entries.map(({ ruleList }) => ({
        rule: ruleNames[ruleIndex],
        stack: ruleList.map((index) => ruleNames[index]),
      }))
    ),
    startRuleCanEndAtCaret: candidates.startRuleCanEndAtCaret,
  };
};

describe('CodeCompletionCore', () => {
  describe('token candidates', () => {
    it('includes EOF, whose end-exclusive interval is [-1, 0)', () => {
      expect(collect(' FROM a  ').tokens).toEqual(['COMMA', 'EOF', 'METADATA', 'PIPE']);
    });

    it('returns exactly the tokens the grammar allows after a RENAME column', () => {
      expect(collect(' FROM a | RENAME x  ', { fromLastPipe: true }).tokens).toEqual([
        'AS',
        'ASSIGN',
      ]);
    });

    it('returns the ENRICH clause keywords after the policy name', () => {
      expect(collect(' FROM a | ENRICH pol  ', { fromLastPipe: true }).tokens).toEqual([
        'ON',
        'WITH',
      ]);
    });

    it('reports the tokens that follow a candidate in a fixed sequence', () => {
      const { following } = collect('FROM a | ', { fromLastPipe: true });

      expect(following.get('JOIN_LOOKUP')).toEqual(['JOIN']);
      expect(following.get('INLINE')).toEqual(['INLINE_STATS']);
      expect(following.get('LIMIT')).toEqual([]);
    });

    it('leaves out ignored tokens', () => {
      expect(collect(' FROM a  ', { ignoredTokens: ['PIPE'] }).tokens).toEqual([
        'COMMA',
        'EOF',
        'METADATA',
      ]);
    });

    it('returns source commands for an empty query', () => {
      expect(collect('').tokens).toEqual(expect.arrayContaining(['FROM', 'ROW', 'SHOW', 'TS']));
    });
  });

  describe('rule candidates', () => {
    it.each([
      [' FROM a | ENRICH  ', 'enrichPolicyName', ['processingCommand', 'enrichCommand']],
      [' FROM a | LIMIT  ', 'constant', ['processingCommand', 'limitCommand']],
      [
        ' FROM a | KEEP x,  ',
        'qualifiedNamePattern',
        ['processingCommand', 'keepCommand', 'qualifiedNamePatterns'],
      ],
    ])('returns the preferred rule at %j', (text, rule, stack) => {
      expect(collect(text, { fromLastPipe: true }).rules).toEqual([{ rule, stack }]);
    });

    it('follows the grammar into a subquery from the query start', () => {
      const { rules } = collect(' FROM a, (FROM b | KEEP  ');

      expect(rules).toHaveLength(1);
      expect(rules[0].rule).toBe('qualifiedNamePattern');
      expect(rules[0].stack).toEqual(expect.arrayContaining(['subquery', 'keepCommand']));
    });

    it('walks precedence rules inside expressions', () => {
      const { tokens, rules } = collect(' FROM a | WHERE x > 1 AND  ', { fromLastPipe: true });

      expect(tokens).toEqual(expect.arrayContaining(['NOT', 'LP']));
      expect([...new Set(rules.map(({ rule }) => rule))].sort()).toEqual([
        'constant',
        'functionName',
        'qualifiedName',
      ]);
    });

    it('keeps every call path of a rule', () => {
      const { rules } = collect(' FROM a | DENSE_VECTOR ', { fromLastPipe: true });

      expect(
        rules.filter(({ rule }) => rule === 'qualifiedName').map(({ stack }) => stack.at(-1))
      ).toEqual(expect.arrayContaining(['denseVectorNaming', 'qualifiedNames']));
    });
  });

  describe('startRuleCanEndAtCaret', () => {
    it.each([
      [' FROM a | ENRICH pol  ', true],
      [' FROM a | SORT b  ', true],
      [' FROM a | LIMIT 10  ', true],
      [' FROM a | LIMIT  ', false],
      [' FROM a | RENAME x  ', false],
      [' FROM a | KEEP x,  ', false],
      [' FROM a | WHERE x > 1 AND  ', false],
    ])('is %j -> %s', (text, expected) => {
      expect(collect(text, { fromLastPipe: true }).startRuleCanEndAtCaret).toBe(expected);
    });
  });

  describe('semantic predicates', () => {
    const text = 'EXTERNAL "s3://bucket/key" ';

    const collectWithPredicate = (result: boolean) => {
      const { parser, tokens } = setup(text);
      const sourceCommandRule = parser.ruleNames.indexOf('sourceCommand');
      const sempred = parser.sempred.bind(parser);
      const spy = jest
        .spyOn(parser, 'sempred')
        .mockImplementation((context, ruleIndex, predIndex) =>
          ruleIndex === sourceCommandRule ? result : sempred(context, ruleIndex, predIndex)
        );
      const caretTokenIndex = tokens.tokens[tokens.tokens.length - 1].tokenIndex;
      const candidates = new CodeCompletionCore(parser, tokens).collectCandidates(caretTokenIndex);

      return { candidates, spy, sourceCommandRule };
    };

    it('evaluates them through the parser', () => {
      const { candidates, spy, sourceCommandRule } = collectWithPredicate(true);

      expect(spy).toHaveBeenCalledWith(null, sourceCommandRule, expect.any(Number));
      expect(candidates.tokens.size).toBeGreaterThan(0);
    });

    it('stops the walk when a predicate fails', () => {
      expect(collectWithPredicate(false).candidates.tokens.size).toBe(0);
    });
  });

  it('returns the same candidates when called again on the same instance', () => {
    const { parser, tokens } = setup(' FROM a | WHERE x > 1 AND  ');
    const core = new CodeCompletionCore(parser, tokens);
    const caretTokenIndex = tokens.tokens[tokens.tokens.length - 1].tokenIndex;

    const first = core.collectCandidates(caretTokenIndex);
    const firstTokens = [...first.tokens.keys()];
    const second = core.collectCandidates(caretTokenIndex);

    expect([...second.tokens.keys()]).toEqual(firstTokens);
  });
});
