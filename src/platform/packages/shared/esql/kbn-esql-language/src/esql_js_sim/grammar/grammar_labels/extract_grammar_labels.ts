/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { Token } from 'antlr4';
import { RULE_END, RULE_START, type GrammarLabel } from './types';

/** The parts of the antlr4 runtime ATN the extraction reads; its typings omit them. */
interface AtnTransition {
  serializationType: number;
  isEpsilon: boolean;
  target: AtnState;
  followState?: AtnState;
  label: { intervals: Array<{ start: number; stop: number }> } | null;
}

interface AtnState {
  stateNumber: number;
  ruleIndex: number;
  transitions: AtnTransition[];
}

export interface Atn {
  states: AtnState[];
  ruleToStartState: AtnState[];
}

export interface GrammarInfo {
  atn: Atn;
  ruleNames: string[];
  symbolicNames: Array<string | null>;
}

export const RULE_TRANSITION = 3;
export const TOKEN_TRANSITIONS = [5, 7, 8]; // atom, set, not-set

export const tokenNames = (transition: AtnTransition, { symbolicNames }: GrammarInfo): string[] => {
  const names: string[] = [];
  for (const { start, stop } of transition.label?.intervals ?? []) {
    for (let type = start; type < stop; type++) {
      names.push(type === Token.EOF ? 'EOF' : symbolicNames[type] ?? String(type));
    }
  }
  return names;
};

/** The tokens (or rule calls, as `<ruleName>`) that can come right after `state`'s rule call. */
export const followedBy = (callState: AtnState, grammar: GrammarInfo): string[] => {
  const call = callState.transitions.find((t) => t.serializationType === RULE_TRANSITION);
  const result = new Set<string>();
  const seen = new Set<number>();
  const pending = call?.followState ? [call.followState] : [];

  while (pending.length) {
    const state = pending.pop()!;
    if (seen.has(state.stateNumber)) {
      continue;
    }
    seen.add(state.stateNumber);
    // The rule's stop state has no transitions within the rule.
    if (state.transitions.length === 0) {
      result.add(RULE_END);
    }
    for (const transition of state.transitions) {
      if (transition.serializationType === RULE_TRANSITION) {
        result.add(`<${grammar.ruleNames[transition.target.ruleIndex]}>`);
      } else if (TOKEN_TRANSITIONS.includes(transition.serializationType)) {
        tokenNames(transition, grammar).forEach((name) => result.add(name));
      } else if (transition.isEpsilon) {
        if (transition.target.ruleIndex !== callState.ruleIndex) {
          result.add(RULE_END);
        } else {
          pending.push(transition.target);
        }
      }
    }
  }

  return [...result].sort();
};

/** The tokens (or rule calls) that can come right before `callState`, or the rule start. */
export const precededBy = (callState: AtnState, grammar: GrammarInfo): string[] => {
  const { atn, ruleNames } = grammar;
  const ruleStates = atn.states.filter((state) => state?.ruleIndex === callState.ruleIndex);
  const start = atn.ruleToStartState[callState.ruleIndex];
  const result = new Set<string>();
  const seen = new Set<number>();
  const pending = [callState];

  while (pending.length) {
    const state = pending.pop()!;
    if (seen.has(state.stateNumber)) {
      continue;
    }
    seen.add(state.stateNumber);
    if (state === start) {
      result.add(RULE_START);
    }
    for (const from of ruleStates) {
      for (const transition of from.transitions) {
        if (transition.serializationType === RULE_TRANSITION) {
          if (transition.followState === state) {
            result.add(`<${ruleNames[transition.target.ruleIndex]}>`);
          }
        } else if (transition.target === state) {
          if (TOKEN_TRANSITIONS.includes(transition.serializationType)) {
            tokenNames(transition, grammar).forEach((name) => result.add(name));
          } else if (transition.isEpsilon) {
            pending.push(from);
          }
        }
      }
    }
  }

  return [...result].sort();
};

// `this.state = 581; localctx._oldName = this.qualifiedNamePattern();` in the generated parser.
const LABELLED_RULE_CALL = /this\.state = (\d+);\s*localctx\._(\w+) = this\.(\w+)\(/g;

/**
 * Every labelled rule call of the grammar, read from the generated parser's source, with the
 * tokens around it. Upstream this runs when the grammar is generated.
 */
export const extractGrammarLabels = (
  parserSource: string,
  grammar: GrammarInfo
): GrammarLabel[] => {
  const labels: GrammarLabel[] = [];

  for (const [, stateNumber, label, method] of parserSource.matchAll(LABELLED_RULE_CALL)) {
    const state = grammar.atn.states[Number(stateNumber)];
    const call = state?.transitions.find((t) => t.serializationType === RULE_TRANSITION);
    // ANTLR appends `_` to a rule's method whose name is reserved: `string` is `string_()`.
    const invokes = grammar.ruleNames.includes(method) ? method : method.replace(/_$/, '');
    // Only rule calls; token labels such as `operator` are left out.
    if (!call || grammar.ruleNames[call.target.ruleIndex] !== invokes) {
      continue;
    }
    labels.push({
      rule: grammar.ruleNames[state.ruleIndex],
      label,
      invokes,
      state: state.stateNumber,
      precededBy: precededBy(state, grammar),
      followedBy: followedBy(state, grammar),
    });
  }

  return labels.sort((a, b) => a.state - b.state);
};
