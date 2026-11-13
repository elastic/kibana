/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from '@elastic/esql';
import { callSiteId } from '../cursor_ir/call_site_id';
import { classifyToken, getTokenText, isExpressionRule } from '../cursor_ir/token_classes';
import type { CallSiteId } from '../cursor_ir/types';
import { getCommandRuleNames, startsCommand } from '../cursor_location/command_rules';
import { PREFERRED_RULES } from '../cursor_location/grammar_rules';
import {
  RULE_TRANSITION,
  TOKEN_TRANSITIONS,
  type Atn,
} from '../grammar_labels/extract_grammar_labels';

/** Where the positions inside an expression are listed: they are the same for every command. */
export const EXPRESSION_POSITIONS = '(expression)';

/**
 * A place of the grammar that takes something the user chooses.
 *
 * - `argument`: a rule that is a name or a value, as a column or a constant.
 * - `expression`: an expression. What it contains is listed once, under `(expression)`.
 * - `value_token`: a token with no fixed text that a rule takes directly, as a METADATA field.
 */
export interface GrammarPosition {
  /** The rule of the command, or `(expression)`. */
  command: string;
  /** The call sites from the command down to the position, outermost first. */
  path: CallSiteId[];
  /** The call site of the position itself, the last of `path`. */
  id: CallSiteId;
  kind: 'argument' | 'expression' | 'value_token';
  /** The rule or the token the position takes. */
  takes: string;
}

/** A token that starts a command, with its fixed text. */
export interface CommandStart {
  token: string;
  text?: string;
}

interface Grammar {
  atn: Atn;
  ruleNames: string[];
  symbolicNames: Array<string | null>;
}

// The first token type of an ATN set transition; its typings are not public.
type Transition = Atn['states'][number]['transitions'][number];

const NOT_SET_TRANSITION = 8;

let grammar: Grammar | undefined;

const getGrammar = (): Grammar => {
  if (!grammar) {
    const { parser } = Parser.create('');
    grammar = {
      // `atn` exists on every antlr4 recognizer at runtime but is missing from its typings.
      atn: (parser as unknown as { atn: Atn }).atn,
      ruleNames: parser.ruleNames,
      symbolicNames: parser.symbolicNames,
    };
  }

  return grammar;
};

/** The token types a transition takes. A "not these" set names no token. */
const tokenTypes = (transition: Transition): number[] => {
  if (
    !TOKEN_TRANSITIONS.includes(transition.serializationType) ||
    transition.serializationType === NOT_SET_TRANSITION
  ) {
    return [];
  }

  const types: number[] = [];
  for (const { start, stop } of transition.label?.intervals ?? []) {
    for (let type = start; type < stop; type++) {
      types.push(type);
    }
  }

  return types;
};

/** What a rule does itself: the rules it calls, with the calling state, and the tokens it takes. */
const contentsOf = (rule: string): { calls: Array<[string, number]>; tokens: number[] } => {
  const { atn, ruleNames } = getGrammar();
  const ruleIndex = ruleNames.indexOf(rule);
  const calls: Array<[string, number]> = [];
  const tokens = new Set<number>();

  for (const state of atn.states) {
    if (state?.ruleIndex !== ruleIndex) {
      continue;
    }
    for (const transition of state.transitions) {
      if (transition.serializationType === RULE_TRANSITION) {
        calls.push([ruleNames[transition.target.ruleIndex], state.stateNumber]);
      }
      tokenTypes(transition).forEach((type) => tokens.add(type));
    }
  }

  return { calls, tokens: [...tokens] };
};

const preferredRules: readonly string[] = PREFERRED_RULES;

let positions: GrammarPosition[] | undefined;

/**
 * Every place of the grammar that takes a name, a value or an expression, for each command.
 * It is read from the grammar alone, so a command a new grammar adds is listed at once, and a
 * command Kibana has not registered is listed like any other.
 */
export const getGrammarPositions = (): GrammarPosition[] => {
  if (positions) {
    return positions;
  }

  const { symbolicNames, ruleNames } = getGrammar();
  const commandRules = getCommandRuleNames();
  const found = new Map<string, GrammarPosition>();
  const add = (position: GrammarPosition) =>
    found.set(`${position.command}|${position.path.join('/')}`, position);

  /** Lists the positions of `rule`, reached from `command` through `path`. */
  const walk = (command: string, rule: string, path: CallSiteId[], above: string[]) => {
    const { calls, tokens } = contentsOf(rule);

    for (const type of tokens) {
      if (getTokenText(type) === undefined && classifyToken(type, false) === 'value') {
        const token = symbolicNames[type] ?? String(type);
        const id = `${rule}>${token}`;
        add({ command, path: [...path, id], id, kind: 'value_token', takes: token });
      }
    }

    for (const [called, state] of calls) {
      // A command inside a command (a branch, a subquery) has its own positions.
      if (startsCommand(called) || above.includes(called)) {
        continue;
      }

      const id = callSiteId(rule, called, state);
      const next = [...path, id];

      if (preferredRules.includes(called)) {
        add({ command, path: next, id, kind: 'argument', takes: called });
      } else if (isExpressionRule(called) && command !== EXPRESSION_POSITIONS) {
        add({ command, path: next, id, kind: 'expression', takes: called });
      } else {
        walk(command, called, next, [...above, called]);
      }
    }
  };

  for (const command of commandRules) {
    walk(command, command, [], [command]);
  }

  // Inside an expression the rules call each other, so there is no path: each place is listed
  // once, by its own call site.
  const expressionRules = new Set(ruleNames.filter(isExpressionRule));
  const pending = [...expressionRules];
  while (pending.length) {
    const rule = pending.pop()!;
    for (const [called] of contentsOf(rule).calls) {
      if (
        !expressionRules.has(called) &&
        !preferredRules.includes(called) &&
        !startsCommand(called)
      ) {
        expressionRules.add(called);
        pending.push(called);
      }
    }
  }
  for (const rule of expressionRules) {
    const { calls, tokens } = contentsOf(rule);
    for (const type of tokens) {
      if (getTokenText(type) === undefined && classifyToken(type, false) === 'value') {
        const token = symbolicNames[type] ?? String(type);
        const id = `${rule}>${token}`;
        add({ command: EXPRESSION_POSITIONS, path: [id], id, kind: 'value_token', takes: token });
      }
    }
    for (const [called, state] of calls) {
      if (preferredRules.includes(called)) {
        const id = callSiteId(rule, called, state);
        add({ command: EXPRESSION_POSITIONS, path: [id], id, kind: 'argument', takes: called });
      }
    }
  }

  positions = [...found.values()];

  return positions;
};

// The rule a call site is in: the part of its id before the label or the called rule.
const callerOf = (id: CallSiteId): string => id.split(/[.>]/)[0];

/**
 * Folds the repeats out of a path. A rule that contains itself, as a map inside a map, makes
 * `locate` report the same call sites again for each level. The table lists them once, so a
 * path is compared with it after the levels in between are dropped.
 */
export const withoutRecursion = (path: CallSiteId[]): CallSiteId[] => {
  const folded: CallSiteId[] = [];

  for (const id of path) {
    const reentered = folded.findIndex((earlier) => callerOf(earlier) === callerOf(id));
    if (reentered !== -1) {
      folded.length = reentered;
    }
    folded.push(id);
  }

  return folded;
};

/**
 * The tokens that can start each command, by the rule of the command: `WHERE` for
 * `whereCommand`, three join types for `joinCommand`.
 */
export const getCommandStarts = (): Record<string, CommandStart[]> => {
  const { atn, ruleNames, symbolicNames } = getGrammar();
  const starts: Record<string, CommandStart[]> = {};

  for (const command of getCommandRuleNames()) {
    const types = new Set<number>();
    const seen = new Set<number>();
    const pending = [atn.ruleToStartState[ruleNames.indexOf(command)]];

    while (pending.length) {
      const state = pending.pop()!;
      if (seen.has(state.stateNumber)) {
        continue;
      }
      seen.add(state.stateNumber);

      for (const transition of state.transitions) {
        const taken = tokenTypes(transition);
        if (taken.length) {
          taken.forEach((type) => types.add(type));
        } else if (transition.isEpsilon || transition.serializationType === RULE_TRANSITION) {
          // A rule call is entered: the first token of the command may be inside it.
          pending.push(transition.target);
        }
      }
    }

    starts[command] = [...types].map((type) => ({
      token: symbolicNames[type] ?? String(type),
      text: getTokenText(type),
    }));
  }

  return starts;
};
