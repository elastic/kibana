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
  getCommandRuleNames,
  getTokenName,
  locateCursor,
} from '../cursor_location/cursor_location';
import type { CursorLocation } from '../cursor_location/types';
import { callSiteId } from './call_site_id';
import { describeCommands } from './describe_commands';
import { classifyToken, getTokenText, isExpressionRule } from './token_classes';
import type {
  CallSiteId,
  CursorIR,
  CursorPosition,
  ExpectedArgument,
  Follower,
  NextToken,
  PreviousToken,
  TokenClass,
  TypedWord,
  WordKind,
  WrittenArgument,
} from './types';

/** A chain of rules, outermost first, with the ATN state that called each one when known. */
interface RuleChain {
  rules: string[];
  invokingStates: Array<number | undefined>;
}

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

const wordKind = (text: string): WordKind => {
  if (text.startsWith('"')) {
    return 'string';
  }
  if (text.startsWith('`')) {
    return 'quoted_name';
  }
  if (/^[+-]?\.?\d/.test(text)) {
    return 'number';
  }

  return text.includes('*') ? 'pattern' : 'name';
};

const toWord = (
  { partial, expectedRules, whitespaceBefore }: CursorLocation,
  followers: Follower[],
  text: string,
  offset: number
): TypedWord | undefined => {
  if (!partial) {
    return undefined;
  }

  const spelled = followers.find((follower) => follower.text === partial.text.toLowerCase());
  // The word continues an argument when it is glued to what comes before, as `b` in `a.b`.
  // That argument started before the word, at the earliest slot the word would extend.
  const starts = whitespaceBefore
    ? []
    : expectedRules
        .filter(({ continuation, start }) => continuation && start < partial.start)
        .map(({ start }) => start);

  return {
    ...partial,
    kind: wordKind(partial.text),
    ...(spelled && { keyword: spelled.token }),
    ...(starts.length && {
      argument: { text: text.slice(Math.min(...starts), offset), start: Math.min(...starts) },
    }),
  };
};

/** The first visible token that starts at or after `from`. */
const toNext = (text: string, from: number): NextToken | undefined => {
  if (!text.slice(from).trim()) {
    return undefined;
  }

  const { tokens } = Parser.create(text);
  tokens.fill();
  const next = tokens.tokens.find(
    ({ type, channel, start }) =>
      type !== Token.EOF && channel === Token.DEFAULT_CHANNEL && start >= from
  );

  return next && { token: getTokenName(next.type), class: classifyToken(next.type, false) };
};

// A name no query contains, which the lexer reads as a name or a value in every mode.
const CURSOR_MARKER = 'esql_cursor_marker';
const CLOSER_OF: Record<string, string> = { '(': ')', '[': ']', '{': '}' };

/** The brackets that are open at the end of the text, innermost last. */
const openBrackets = (textBefore: string): string[] => {
  const { tokens } = Parser.create(textBefore);
  tokens.fill();
  const open: string[] = [];

  for (const { type, channel } of tokens.tokens) {
    if (channel !== Token.DEFAULT_CHANNEL) {
      continue;
    }

    const tokenClass = classifyToken(type, false);
    if (tokenClass === 'opener') {
      open.push(getTokenText(type) ?? '(');
    } else if (tokenClass === 'closer') {
      open.pop();
    }
  }

  return open;
};

/**
 * What is written in the command that starts at `commandStart`, the innermost one if several do.
 *
 * The parser recovers from an unfinished command by guessing, which can rearrange what was
 * written. So the text is finished first with what the grammar expects at the cursor: a name
 * where an argument or a value can come, then the brackets that are still open. Whatever the
 * parser reads from the added text is left out again.
 */
const toWritten = (
  textBefore: string,
  commandStart: number,
  expectsValue: boolean
): WrittenArgument[] => {
  const caret = textBefore.length;
  const closers = openBrackets(textBefore)
    .reverse()
    .map((opener) => CLOSER_OF[opener] ?? '')
    .join('');
  const finished = `${textBefore}${expectsValue ? CURSOR_MARKER : ''}${closers}`;
  const command = describeCommands(finished).findLast(({ start }) => start === commandStart);

  return (command?.arguments ?? [])
    .filter(({ start }) => start < caret)
    .map((argument) => ({
      ...argument,
      text: argument.text.slice(0, caret - argument.start),
      end: Math.min(argument.end, caret),
      ...(argument.end > caret && { open: true }),
      ancestors: argument.ancestors.map((ancestor) => ({
        ...ancestor,
        end: Math.min(ancestor.end, caret),
        open: ancestor.end > caret || (ancestor.end === caret && !expectsValue),
      })),
    }));
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
  if (location.partial?.text.startsWith('"') && !location.partial.complete) {
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

  const word = toWord(location, followers, text, offset);
  // What is written ends where the word being typed starts.
  const caret = word?.start ?? offset;
  const onlyFollower = followers.length === 1 && !expected.length ? followers[0].token : undefined;

  const position = toPosition(location, expected, followers, previous);

  return {
    position,
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
    ...(onlyFollower && { onlyFollower }),
    word,
    next: toNext(text, offset),
    written:
      location.inComment || location.segment.start === caret
        ? []
        : toWritten(
            text.slice(0, caret),
            location.segment.start,
            // After a complete argument nothing has to follow, so nothing is added.
            position !== 'after_argument' &&
              (expected.length > 0 || followers.some((follower) => follower.class === 'value'))
          ),
  };
};
