/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { Parser } from '@elastic/esql';
import {
  followedBy,
  precededBy,
  RULE_TRANSITION,
  TOKEN_TRANSITIONS,
  tokenNames,
  type Atn,
  type GrammarInfo,
} from './extract_grammar_labels';
import { GRAMMAR_LABELS } from './grammar_labels.generated';
import type { CallSite } from './types';

let grammar: GrammarInfo | undefined;
const sites = new Map<string, CallSite[]>();

const getGrammar = (): GrammarInfo => {
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

/** Whether `rule` matches the token itself, as `metadata` matches `UNQUOTED_SOURCE`. */
export const ruleMatchesToken = (rule: string, token: string): boolean => {
  const info = getGrammar();
  const ruleIndex = info.ruleNames.indexOf(rule);
  return info.atn.states.some(
    (state) =>
      state?.ruleIndex === ruleIndex &&
      state.transitions.some(
        (transition) =>
          TOKEN_TRANSITIONS.includes(transition.serializationType) &&
          tokenNames(transition, info).includes(token)
      )
  );
};

/** The rules `rule` calls, as `string` and `primaryExpression` in `grokCommand`. */
export const getCalledRules = (rule: string): string[] => {
  const info = getGrammar();
  const ruleIndex = info.ruleNames.indexOf(rule);
  const called = new Set<string>();
  for (const state of info.atn.states) {
    if (state?.ruleIndex !== ruleIndex) {
      continue;
    }
    for (const { serializationType, target } of state.transitions) {
      if (serializationType === RULE_TRANSITION) {
        called.add(info.ruleNames[target.ruleIndex]);
      }
    }
  }
  return [...called];
};

/**
 * The calls of `invokes` inside `rule`, labelled or not, e.g. the two `string` calls in
 * `grokCommand: GROK primaryExpression string (COMMA string)*`. The tokens around each call
 * are read from the grammar's ATN, so they need no generated table; the labels come from one.
 */
export const getCallSites = (rule: string, invokes: string): CallSite[] => {
  const key = `${rule}>${invokes}`;
  const cached = sites.get(key);
  if (cached) {
    return cached;
  }

  const info = getGrammar();
  const ruleIndex = info.ruleNames.indexOf(rule);
  const invokedIndex = info.ruleNames.indexOf(invokes);
  const found: CallSite[] = [];
  for (const state of info.atn.states) {
    const calls =
      state?.ruleIndex === ruleIndex &&
      state.transitions.some(
        ({ serializationType, target }) =>
          serializationType === RULE_TRANSITION && target.ruleIndex === invokedIndex
      );
    if (!calls) {
      continue;
    }
    const label = GRAMMAR_LABELS.find(({ state: labelled }) => labelled === state.stateNumber);
    found.push({
      rule,
      invokes,
      state: state.stateNumber,
      ...(label && { label: label.label }),
      precededBy: precededBy(state, info),
      followedBy: followedBy(state, info),
    });
  }

  sites.set(key, found);
  return found;
};
