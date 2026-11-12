/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Token } from 'antlr4';
import {
  getCommandRuleNames,
  getTokenName,
  locateCursor,
} from '../cursor_location/cursor_location';
import type { CursorLocation } from '../cursor_location/types';
import { GRAMMAR_LABELS } from '../grammar_labels/grammar_labels.generated';
import { classifyToken, getTokenText, isExpressionRule } from './token_classes';
import type {
  CallSiteId,
  CursorIR,
  CursorPosition,
  ExpectedArgument,
  Follower,
  PreviousToken,
  TokenClass,
  TypedWord,
} from './types';

/** A chain of rules, outermost first, with the ATN state that called each one when known. */
interface RuleChain {
  rules: string[];
  invokingStates: Array<number | undefined>;
}

const labelsByState = new Map(GRAMMAR_LABELS.map((label) => [label.state, label]));

const callSiteId = (rule: string, called: string, invokingState?: number): CallSiteId => {
  const label = invokingState === undefined ? undefined : labelsByState.get(invokingState);

  return label && label.rule === rule && label.invokes === called
    ? `${rule}.${label.label}`
    : `${rule}>${called}`;
};

/** The innermost command of a chain, and the call sites from that command down to its end. */
const describeChain = ({
  rules,
  invokingStates,
}: RuleChain): { command?: string; enclosingCommands: string[]; path: CallSiteId[] } => {
  const commandRules = getCommandRuleNames();
  const commandIndexes = rules.flatMap((rule, index) =>
    commandRules.includes(rule) ? [index] : []
  );
  const commandIndex = commandIndexes.at(-1) ?? -1;
  const path: CallSiteId[] = [];

  // Without a command the chain starts at a rule that only chooses one, which is no call site.
  for (let index = Math.max(commandIndex, 0) + 1; index < rules.length; index++) {
    path.push(callSiteId(rules[index - 1], rules[index], invokingStates[index]));
  }

  return {
    command: rules[commandIndex],
    enclosingCommands: commandIndexes.slice(0, -1).map((index) => rules[index]),
    path,
  };
};

const toArguments = ({ expectedRules }: CursorLocation): ExpectedArgument[] => {
  const byKey = new Map<string, ExpectedArgument>();

  for (const { rule, stack, invokingStates = [], continuation } of expectedRules) {
    const { command, path } = describeChain({ rules: [...stack, rule], invokingStates });
    const id = path.at(-1) ?? rule;
    const key = `${command}|${path.join('/')}|${continuation}`;

    if (!byKey.has(key)) {
      byKey.set(key, { id, rule, path, command, continues: continuation });
    }
  }

  return [...byKey.values()];
};

const toFollowers = ({ expectedTokens, tokenStacks }: CursorLocation): Follower[] =>
  [...expectedTokens].map((type) => {
    const token = getTokenName(type);
    const text = getTokenText(type);
    const stack = tokenStacks.get(type);

    // A token with no stack is one the end of the command allows: a pipe or the end of the query.
    if (!stack) {
      return { token, class: classifyToken(type, false), text, path: [], startsCommand: false };
    }

    const { command, path } = describeChain(stack);
    const inExpression = stack.rules
      .slice(command ? stack.rules.lastIndexOf(command) + 1 : 0)
      .some(isExpressionRule);
    // The name of a command is taken by the rule of that command, whose call is no argument.
    const owner = stack.startsCommand ? stack.command : stack.rules.at(-1);

    return {
      token,
      class: classifyToken(type, inExpression),
      text,
      id: `${owner}>${token}`,
      path: stack.startsCommand ? [] : path,
      command: stack.startsCommand ? stack.command : command,
      startsCommand: stack.startsCommand,
    };
  });

const toPrevious = ({
  previousTokenType,
  whitespaceBefore,
}: CursorLocation): PreviousToken | undefined =>
  previousTokenType === undefined || previousTokenType === Token.EOF
    ? undefined
    : {
        token: getTokenName(previousTokenType),
        class: classifyToken(previousTokenType, false),
        glued: !whitespaceBefore,
      };

const toWord = ({ partial }: CursorLocation, followers: Follower[]): TypedWord | undefined => {
  if (!partial) {
    return undefined;
  }

  const spelled = followers.find(({ text }) => text === partial.text.toLowerCase());

  return { ...partial, ...(spelled && { keyword: spelled.token }) };
};

const COMPLETE: readonly TokenClass[] = ['value', 'closer'];

const toPosition = (
  location: CursorLocation,
  expected: ExpectedArgument[],
  followers: Follower[],
  previous: PreviousToken | undefined
): CursorPosition => {
  if (location.inComment) {
    return 'inside_comment';
  }
  // The lexer makes no token of an unterminated string, so its text is still the word typed.
  if (location.partial?.text.startsWith('"')) {
    return 'inside_string';
  }
  if (!expected.length && !followers.length) {
    return 'invalid';
  }
  if (followers.some(({ startsCommand }) => startsCommand)) {
    if (!previous) {
      return 'start_of_query';
    }

    return previous.class === 'terminator' ? 'start_of_statement' : 'start_of_command';
  }
  if (expected.length && expected.every(({ continues }) => continues) && !followers.length) {
    return 'inside_argument';
  }

  return previous && COMPLETE.includes(previous.class) ? 'after_argument' : 'start_of_argument';
};

/** The most frequent value, so a stray candidate does not decide the command. */
const mostFrequent = (values: Array<string | undefined>): string | undefined => {
  const counts = new Map<string, number>();

  for (const value of values) {
    if (value) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }

  return [...counts].sort(([, first], [, second]) => second - first)[0]?.[0];
};

/**
 * Describes the cursor at `offset` in terms of the grammar: where it is, which arguments and
 * tokens can come next, and the word being typed. It knows no command by name.
 */
export const locate = (text: string, offset: number): CursorIR => {
  const location = locateCursor(text, offset);
  const expected = toArguments(location);
  const followers = toFollowers(location);
  const previous = toPrevious(location);
  const shared = describeChain({ rules: location.ruleStack, invokingStates: [] });
  // Inside a branch the candidates agree on the command while their shared rules stop above it.
  const command =
    mostFrequent([
      ...expected.map((argument) => argument.command),
      ...followers
        .filter(({ startsCommand }) => !startsCommand)
        .map((follower) => follower.command),
    ]) ?? shared.command;

  return {
    position: toPosition(location, expected, followers, previous),
    command,
    enclosingCommands:
      command && command !== shared.command
        ? [...shared.enclosingCommands, ...(shared.command ? [shared.command] : [])]
        : shared.enclosingCommands,
    segment: location.segment,
    previous,
    arguments: expected,
    followers,
    canEnd: location.commandCanEnd,
    word: toWord(location, followers),
  };
};
