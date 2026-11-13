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
import { guardModePops } from '../cursor_location/guard_mode_pops';
import type { TokenClass } from './types';

interface Vocabulary {
  /** The fixed text of each token type that has one, lower-cased. */
  texts: Map<number, string>;
  /** The rules that parse with precedence, which are the expression rules. */
  precedenceRules: Set<string>;
}

const BRACKETS = ['(', ')', '[', ']', '{', '}'];
const OPENERS = ['(', '[', '{'];
const CLOSERS = [')', ']', '}'];
const WORD = /^[a-z][a-z_ ]*$/;

let vocabulary: Vocabulary | undefined;

/**
 * Reads the fixed texts from the grammar. A token defined once has its text in the grammar's
 * literal names. A token defined in several lexer modes (`(`, `STATS`) has none, so the lexer
 * is asked: what it makes of a bracket, and of the token's own name, in each of its modes.
 */
const getVocabulary = (): Vocabulary => {
  if (vocabulary) {
    return vocabulary;
  }

  const { parser, lexer } = Parser.create('');
  const { literalNames, symbolicNames, ruleNames } = parser;
  const texts = new Map<number, string>();

  literalNames.forEach((literal, type) => {
    if (literal) {
      texts.set(type, literal.slice(1, -1).toLowerCase());
    }
  });

  // `modeNames` exists on every antlr4 lexer at runtime but is missing from its typings.
  const modeCount = (lexer as unknown as { modeNames: string[] }).modeNames.length;

  /** The type of the token the lexer makes of the whole text in a mode, if it makes one. */
  const lexAs = (text: string, mode: number): number | undefined => {
    const { lexer: probe } = Parser.create(text);
    probe.removeErrorListeners();
    // Pushed on the default mode, so a mode that pops itself has a mode to return to.
    probe.pushMode(mode);

    try {
      const { type, start, stop } = guardModePops(probe).nextToken();

      return type !== Token.EOF && start === 0 && stop === text.length - 1 ? type : undefined;
    } catch (error) {
      // A mode the lexer cannot run from here gives no text for the token.
      return undefined;
    }
  };

  const modes = Array.from({ length: modeCount }, (_, mode) => mode);

  /**
   * The modes where the text is a token of fixed text. A token that also takes the text twice
   * is a name or a value that happens to match it.
   */
  const fixedTypes = (text: string): number[] =>
    modes.flatMap((mode) => {
      const type = lexAs(text, mode);

      return type !== undefined && lexAs(text + text, mode) !== type ? [type] : [];
    });

  for (const bracket of BRACKETS) {
    for (const type of fixedTypes(bracket)) {
      if (!texts.has(type)) {
        texts.set(type, bracket);
      }
    }
  }

  symbolicNames.forEach((name, type) => {
    if (!name || texts.has(type)) {
      return;
    }

    // `INLINE_STATS` is typed `stats` after `INLINE`, so the words of a name are tried too.
    const words = name.toLowerCase().split('_');
    const spellings = [words.join(' '), words.join('_'), ...words];
    const spelling = spellings.find((text) => fixedTypes(text).includes(type));

    if (spelling) {
      texts.set(type, spelling);
    }
  });

  // `atn` exists on every antlr4 recognizer at runtime but is missing from its typings.
  const { ruleToStartState } = (
    parser as unknown as { atn: { ruleToStartState: Array<{ isPrecedenceRule: boolean }> } }
  ).atn;

  vocabulary = {
    texts,
    precedenceRules: new Set(
      ruleNames.filter((_, index) => ruleToStartState[index].isPrecedenceRule)
    ),
  };

  return vocabulary;
};

/** The fixed text of a token type, lower-cased, e.g. `by`; undefined for a name or a value. */
export const getTokenText = (type: number): string | undefined => getVocabulary().texts.get(type);

/** Whether a rule is an expression rule: one the grammar parses with operator precedence. */
export const isExpressionRule = (rule: string): boolean =>
  getVocabulary().precedenceRules.has(rule);

/**
 * Classifies a token by its text and by whether it is expected inside an expression. No token
 * is named here, so a token a new grammar adds is classified the same way.
 */
export const classifyToken = (type: number, inExpression: boolean): TokenClass => {
  if (type === Token.EOF) {
    return 'end';
  }

  const text = getTokenText(type);

  if (text === undefined) {
    return 'value';
  }
  if (WORD.test(text)) {
    return inExpression ? 'operator' : 'keyword';
  }
  if (text === ',') {
    return 'separator';
  }
  if (OPENERS.includes(text)) {
    return 'opener';
  }
  if (CLOSERS.includes(text)) {
    return 'closer';
  }
  if (text === '|') {
    return 'pipe';
  }
  if (text === ';') {
    return 'terminator';
  }

  return 'operator';
};
