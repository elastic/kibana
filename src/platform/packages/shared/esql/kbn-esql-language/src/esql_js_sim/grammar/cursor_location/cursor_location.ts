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
import {
  CodeCompletionCore,
  type CandidatesCollection,
  type RuleWithStartToken,
} from '../code_completion/code_completion_core';
import { getCalledRules } from '../grammar_labels/call_sites';
import {
  COMMAND_DISPATCH_RULES,
  COMMAND_RULES,
  NOT_COMMAND_RULES,
  PIPE_ANCHOR_RULE,
  PREFERRED_RULES,
} from './grammar_rules';
import type { CommandSegment, CursorLocation, ExpectedRule } from './types';

interface GrammarInfo {
  ruleNames: string[];
  symbolicNames: Array<string | null>;
  /** Each token's fixed text in the grammar, quoted, e.g. `'group'`; null for names and values. */
  literalNames: Array<string | null>;
  pipe: number;
  lp: number;
  dot: number;
  rp: number;
  /** A source name or pattern, e.g. `logs-*`, which may end in `-` or `*` while typed. */
  unquotedSource: number;
  anchorRule: number;
  preferredRules: Set<number>;
  commandRules: Set<number>;
  /** The rule of each command, e.g. `whereCommand`. */
  commandOwnRules: Set<number>;
  lineComments: Set<number>;
  blockComments: Set<number>;
}

let grammarInfo: GrammarInfo | undefined;

const getGrammarInfo = (): GrammarInfo => {
  if (grammarInfo) {
    return grammarInfo;
  }

  const { ruleNames, symbolicNames, literalNames } = Parser.create('').parser;
  const ruleIndexes = (names: readonly string[]) =>
    new Set(names.map((name) => ruleNames.indexOf(name)));
  // Each lexer mode has its own comment tokens, e.g. `FROM_LINE_COMMENT`.
  const lineComments = new Set<number>();
  const blockComments = new Set<number>();
  symbolicNames.forEach((name, type) => {
    if (name?.endsWith('MULTILINE_COMMENT')) {
      blockComments.add(type);
    } else if (name?.endsWith('LINE_COMMENT')) {
      lineComments.add(type);
    }
  });

  grammarInfo = {
    ruleNames,
    symbolicNames,
    literalNames,
    pipe: symbolicNames.indexOf('PIPE'),
    lp: symbolicNames.indexOf('LP'),
    dot: symbolicNames.indexOf('DOT'),
    rp: symbolicNames.indexOf('RP'),
    unquotedSource: symbolicNames.indexOf('UNQUOTED_SOURCE'),
    anchorRule: ruleNames.indexOf(PIPE_ANCHOR_RULE),
    preferredRules: ruleIndexes(PREFERRED_RULES),
    commandRules: ruleIndexes(COMMAND_RULES),
    commandOwnRules: ruleIndexes(getCommandRuleNames()),
    lineComments,
    blockComments,
  };

  return grammarInfo;
};

let commandRuleNames: string[] | undefined;

/** The rule of each command, read from the grammar: the rules its dispatch rules call. */
export const getCommandRuleNames = (): string[] => {
  if (!commandRuleNames) {
    const notCommands: readonly string[] = NOT_COMMAND_RULES;
    commandRuleNames = [...new Set(COMMAND_DISPATCH_RULES.flatMap(getCalledRules))].filter(
      (rule) => !notCommands.includes(rule)
    );
  }

  return commandRuleNames;
};

/** Token type of an ES|QL grammar token name, e.g. `AS`; `-1` (EOF) is returned as `Token.EOF`. */
export const getTokenType = (name: string): number =>
  name === 'EOF' ? Token.EOF : getGrammarInfo().symbolicNames.indexOf(name);

/** The grammar name of a token type, e.g. `AS`; the inverse of `getTokenType`. */
export const getTokenName = (type: number): string =>
  type === Token.EOF ? 'EOF' : getGrammarInfo().symbolicNames[type] ?? '';

const isVisible = (token: Token) => token.channel === Token.DEFAULT_CHANNEL;

/** The lexer's mode and the modes below it, where a token would start. */
interface LexerModes {
  mode: number;
  stack: number[];
}

const lexableCache = new Map<string, boolean>();

/**
 * Whether the lexer, in `modes`, reads a token's fixed text as that token. The parser may
 * expect a keyword the lexer cannot produce there, as `GROUP` after FUSE's `WITH { … }`, which
 * leaves the FUSE mode: `group` would be a name.
 */
const isLexable = (type: number, { mode, stack }: LexerModes, grammar: GrammarInfo): boolean => {
  const literal = grammar.literalNames[type];
  if (!literal) {
    return true;
  }
  const key = `${type}:${mode}:${stack.join()}`;
  let lexable = lexableCache.get(key);
  if (lexable === undefined) {
    const { lexer } = Parser.create(literal.slice(1, -1));
    const [bottom = mode, ...above] = [...stack, mode];
    lexer.setMode(bottom);
    above.forEach((next) => lexer.pushMode(next));
    lexable = lexer.nextToken().type === type;
    lexableCache.set(key, lexable);
  }
  return lexable;
};

/**
 * Lexer modes treat an unterminated `/*` differently (dropped, or lexed as `/` and `*`), so close
 * it and check whether a block comment now ends at the added `*\/`.
 */
const isInUnterminatedBlockComment = (
  textBeforeCursor: string,
  { blockComments }: GrammarInfo
): boolean => {
  if (!textBeforeCursor.includes('/*')) {
    return false;
  }
  const { tokens } = Parser.create(`${textBeforeCursor}*/`);
  tokens.fill();
  return tokens.tokens.some(
    ({ type, stop }) => blockComments.has(type) && stop + 1 === textBeforeCursor.length + 2
  );
};

/** Longest prefix shared by all stacks, comparing rule and start token. */
const commonPrefix = (stacks: RuleWithStartToken[][]): RuleWithStartToken[] => {
  const [first = [], ...rest] = stacks;
  let length = first.length;
  for (const stack of rest) {
    let index = 0;
    while (
      index < Math.min(length, stack.length) &&
      stack[index].ruleIndex === first[index].ruleIndex &&
      stack[index].startTokenIndex === first[index].startTokenIndex
    ) {
      index++;
    }
    length = index;
  }
  return first.slice(0, length);
};

/** The stack shared by all candidates, preferring the candidates found inside a command. */
const getSharedStack = (
  candidates: CandidatesCollection,
  { commandRules }: GrammarInfo
): RuleWithStartToken[] => {
  const stacks = [
    ...[...candidates.rules.values()].flat().map(({ callStack }) => callStack),
    ...candidates.tokenCallStacks.values(),
  ];
  const inCommand = stacks.filter((stack) =>
    stack.some(({ ruleIndex }) => commandRules.has(ruleIndex))
  );

  return commonPrefix(inCommand.length ? inCommand : stacks);
};

const emptyLocation = (offset: number, inComment: boolean): CursorLocation => ({
  segment: { start: offset, end: offset, text: '' },
  ruleStack: [],
  expectedTokens: new Set(),
  tokenStacks: new Map(),
  expectedRules: [],
  commandCanEnd: false,
  whitespaceBefore: false,
  skippedText: '',
  inComment,
});

/**
 * Asks the grammar what can be typed at `offset`: the expected tokens and rule slots, the
 * innermost command around the cursor, and the word being typed.
 */
export const locateCursor = (text: string, offset: number): CursorLocation => {
  const textBeforeCursor = text.slice(0, offset);
  const { lexer, parser, tokens } = Parser.create(textBeforeCursor);
  tokens.fill();
  const modesAtEnd: LexerModes = { mode: lexer.getMode(), stack: [...lexer.getModeStack()] };

  const grammar = getGrammarInfo();
  const allTokens = tokens.tokens;
  const eof = allTokens[allTokens.length - 1];
  const lastToken: Token | undefined = allTokens[allTokens.length - 2];

  // The lexer emits nothing for an unterminated string or quoted name, or for characters it
  // cannot match, so whatever follows the last token is still being typed.
  const lexedEnd = lastToken ? lastToken.stop + 1 : 0;
  const tail = textBeforeCursor.slice(lexedEnd);
  const untokenized = tail.trimStart();

  const inLineComment =
    lastToken !== undefined &&
    grammar.lineComments.has(lastToken.type) &&
    !/[\r\n]$/.test(lastToken.text);
  if (inLineComment || isInUnterminatedBlockComment(textBeforeCursor, grammar)) {
    return emptyLocation(offset, true);
  }

  // The caret is the word being typed when the cursor touches one, otherwise the next token.
  // Untokenized characters directly after a word (e.g. the `:` of `_any:`) belong to that word.
  // A dot after whitespace starts a decimal (`SAMPLE .`), as a dotted name has no space before it.
  // A source name is a word however it ends, as `logs-` or `logs-*`.
  const startsDecimal =
    lastToken?.type === grammar.dot && /\s/.test(textBeforeCursor.charAt(lastToken.start - 1));
  const isTypingWord =
    lastToken !== undefined &&
    isVisible(lastToken) &&
    (/\w$/.test(lastToken.text) || startsDecimal || lastToken.type === grammar.unquotedSource) &&
    tail === untokenized;
  const caret = isTypingWord ? lastToken : eof;

  let partial: CursorLocation['partial'];
  if (isTypingWord) {
    partial = { text: lastToken.text + tail, start: lastToken.start };
  } else if (untokenized) {
    partial = { text: untokenized, start: offset - untokenized.length };
  }

  const previousToken = allTokens.slice(0, caret.tokenIndex).findLast(isVisible);

  // Between the previous token and the caret there are only hidden tokens (whitespace,
  // comments) and characters the lexer dropped.
  let skippedText = '';
  let whitespaceBefore = false;
  let position = previousToken ? previousToken.stop + 1 : 0;
  for (const hidden of allTokens.slice((previousToken?.tokenIndex ?? -1) + 1, caret.tokenIndex)) {
    skippedText += textBeforeCursor.slice(position, hidden.start);
    whitespaceBefore = true;
    position = hidden.stop + 1;
  }
  const beforeCaret = textBeforeCursor.slice(position, partial ? partial.start : offset);
  whitespaceBefore = whitespaceBefore || /\s/.test(beforeCaret);
  skippedText = (skippedText + beforeCaret).replace(/\s+/g, '');

  // Lexical nesting only: a pipe inside parentheses belongs to a nested query, which is part
  // of the enclosing command.
  const depthAt: number[] = [];
  let depth = 0;
  for (let index = 0; index < caret.tokenIndex; index++) {
    const { type } = allTokens[index];
    if (type === grammar.lp) {
      depth++;
    } else if (type === grammar.rp) {
      depth = Math.max(0, depth - 1);
    }
    depthAt[index] = depth;
  }

  const core = new CodeCompletionCore(parser, tokens);
  core.preferredRules = grammar.preferredRules;

  let candidates: CandidatesCollection | undefined;
  let anchorToken: Token | undefined;
  for (let index = caret.tokenIndex - 1; index >= 0; index--) {
    if (allTokens[index].type !== grammar.pipe || depthAt[index] !== 0) {
      continue;
    }
    const start = allTokens[index + 1];
    const collected = core.collectCandidates(caret.tokenIndex, {
      ruleIndex: grammar.anchorRule,
      start,
    });
    // The grammar accepted this anchor.
    if (collected.tokens.size || collected.rules.size || collected.startRuleCanEndAtCaret) {
      candidates = collected;
      anchorToken = allTokens.slice(index + 1).find(isVisible);
      break;
    }
  }
  if (!candidates) {
    candidates = core.collectCandidates(caret.tokenIndex);
  }

  // Before a word being typed the modes are those at its start, which the word may change.
  let modes = modesAtEnd;
  if (caret !== eof) {
    const { lexer: before } = Parser.create(textBeforeCursor.slice(0, caret.start));
    before.getAllTokens();
    modes = { mode: before.getMode(), stack: [...before.getModeStack()] };
  }
  const expectedTokens = new Set(
    [...candidates.tokens.keys()].filter((type) => isLexable(type, modes, grammar))
  );
  let commandCanEnd: boolean;
  if (anchorToken) {
    commandCanEnd = candidates.startRuleCanEndAtCaret;
    // The anchored walk stops at the end of the command, so add what may follow one.
    if (commandCanEnd) {
      expectedTokens.add(grammar.pipe);
      expectedTokens.add(depth === 0 ? Token.EOF : grammar.rp);
    }
  } else {
    commandCanEnd = expectedTokens.has(grammar.pipe);
  }

  const { ruleNames } = grammar;
  const expectedRules: ExpectedRule[] = [...candidates.rules].flatMap(([ruleIndex, entries]) =>
    entries.map(({ callStack, startTokenIndex, invokingState }) => {
      const continuation = startTokenIndex < caret.tokenIndex;
      const slotStart = allTokens[startTokenIndex].start;
      const enclosingStart = callStack.findLastIndex(
        (entry) => entry.startTokenIndex !== startTokenIndex
      );
      return {
        rule: ruleNames[ruleIndex],
        stack: callStack.map((entry) => ruleNames[entry.ruleIndex]),
        invokingStates: [...callStack.map((entry) => entry.invokingState), invokingState],
        startsRules: callStack.length - 1 - enclosingStart,
        continuation,
        text:
          continuation && previousToken
            ? textBeforeCursor.slice(slotStart, previousToken.stop + 1)
            : '',
        previousTokenType: allTokens.slice(0, startTokenIndex).findLast(isVisible)?.type,
      };
    })
  );

  const sharedStack = getSharedStack(candidates, grammar);
  const command = sharedStack.findLast(({ ruleIndex }) => grammar.commandRules.has(ruleIndex));
  const commandToken =
    (command && allTokens[command.startTokenIndex]) ??
    anchorToken ??
    allTokens.find(isVisible) ??
    eof;
  const segmentStart = commandToken.type === Token.EOF ? offset : commandToken.start;
  const segment: CommandSegment = {
    start: segmentStart,
    end: offset,
    text: textBeforeCursor.slice(segmentStart),
  };

  return {
    segment,
    ruleStack: sharedStack.map(({ ruleIndex }) => ruleNames[ruleIndex]),
    expectedTokens,
    tokenStacks: new Map(
      [...candidates.tokenCallStacks]
        .filter(([type]) => expectedTokens.has(type))
        .map(([type, callStack]) => {
          const ownCommand = callStack.findLast(({ ruleIndex }) =>
            grammar.commandOwnRules.has(ruleIndex)
          );
          const startsCommand = ownCommand?.startTokenIndex === caret.tokenIndex;

          return [
            type,
            {
              rules: callStack.map(({ ruleIndex }) => ruleNames[ruleIndex]),
              invokingStates: callStack.map(({ invokingState }) => invokingState),
              startsCommand,
              ...(startsCommand && ownCommand && { command: ruleNames[ownCommand.ruleIndex] }),
            },
          ];
        })
    ),
    expectedRules,
    commandCanEnd,
    partial,
    previousTokenType: previousToken?.type,
    whitespaceBefore,
    skippedText,
    inComment: false,
  };
};
