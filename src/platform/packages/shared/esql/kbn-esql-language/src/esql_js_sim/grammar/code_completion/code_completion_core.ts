/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This module is based on `CodeCompletionCore` from antlr4-c3
 * (https://github.com/mike-lischke/antlr4-c3/blob/1aabe21e8b/src/CodeCompletionCore.ts),
 * ported from the `antlr4ng` runtime to the `antlr4` runtime used by `@elastic/esql`.
 * Debug output was removed, follow sets use plain number sets, and the collection also
 * reports whether the start rule can end right before the caret and the call stack under
 * which each candidate was found.
 */

/**
 * @notice
 * This product includes code that is adapted from antlr4-c3, which is available under
 * a "MIT" license.
 *
 * MIT License
 *
 * Copyright (c) 2016 - present Mike Lischke
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { Token } from 'antlr4';
import type { Parser as EsqlParserFactory } from '@elastic/esql';

type EsqlParser = ReturnType<typeof EsqlParserFactory.create>['parser'];

// The `antlr4` type declarations do not describe the ATN graph, so the fields read at
// runtime are declared here. Values were checked against antlr4@4.13.2.

/** `Transition.serializationType` values of the `antlr4` runtime. */
const TransitionType = {
  EPSILON: 1,
  RANGE: 2,
  RULE: 3,
  PREDICATE: 4,
  ATOM: 5,
  ACTION: 6,
  SET: 7,
  NOT_SET: 8,
  WILDCARD: 9,
  PRECEDENCE: 10,
} as const;

const RULE_STOP_STATE_TYPE = 7;

/** The runtime's `Token.MIN_USER_TOKEN_TYPE`, which its typings omit. */
const MIN_USER_TOKEN_TYPE = 1;

interface RuntimeInterval {
  start: number;
  /** Exclusive. */
  stop: number;
}

interface RuntimeIntervalSet {
  intervals: RuntimeInterval[] | null;
  contains(symbol: number): boolean;
}

interface RuntimePredicate {
  evaluate(parser: EsqlParser, outerContext: null): boolean;
}

interface RuntimeTransition {
  readonly serializationType: number;
  readonly target: RuntimeAtnState;
  readonly isEpsilon: boolean;
  readonly label: RuntimeIntervalSet | null;
  /** Rule transitions only. */
  readonly followState?: RuntimeAtnState;
  /** Rule and precedence transitions only. */
  readonly precedence?: number;
  /** Predicate transitions only. */
  getPredicate?(): RuntimePredicate;
}

interface RuntimeAtnState {
  readonly stateNumber: number;
  readonly stateType: number;
  readonly ruleIndex: number;
  readonly transitions: RuntimeTransition[];
  /** Rule start states only; c3 on antlr4ng calls it `isLeftRecursiveRule`. */
  readonly isPrecedenceRule?: boolean;
}

interface RuntimeAtn {
  readonly maxTokenType: number;
  readonly ruleToStartState: RuntimeAtnState[];
  readonly ruleToStopState: RuntimeAtnState[];
}

interface TokenSource {
  get(index: number): Token | undefined;
}

const getRuntimeAtn = (parser: EsqlParser): RuntimeAtn =>
  // `atn` exists on every antlr4 recognizer at runtime but is missing from its typings.
  (parser as unknown as { atn: RuntimeAtn }).atn;

export type TokenList = number[];
export type RuleList = number[];

export interface CandidateRule {
  startTokenIndex: number;
  ruleList: RuleList;
  /** The rules above this one, with the tokens they start at. */
  callStack: RuleWithStartToken[];
  /** The ATN state of the rule above that called this one. */
  invokingState?: number;
}

export interface RuleWithStartToken {
  startTokenIndex: number;
  ruleIndex: number;
  /**
   * The ATN state of the rule above that called this one, telling apart calls of the same rule,
   * as FUSE's `SCORE BY` and `GROUP BY` columns. Unset for the start rule.
   */
  invokingState?: number;
}

/**
 * Tokens and rules valid at the caret. Token entries list the tokens that directly follow
 * them in a fixed sequence; rule entries carry the rule's start token and its call stack.
 */
export interface CandidatesCollection {
  tokens: Map<number, TokenList>;
  /** The call stack under which each token was first collected. */
  tokenCallStacks: Map<number, RuleWithStartToken[]>;
  /**
   * For each rule, one candidate per call path, as `qualifiedName` both as DENSE_VECTOR's target
   * name and as its first column at `DENSE_VECTOR `.
   */
  rules: Map<number, CandidateRule[]>;
  /** Whether the start rule can end right before the caret, without consuming it. */
  startRuleCanEndAtCaret: boolean;
}

/** Where to start collecting: a rule index and the token that rule starts at. */
export interface CollectionStart {
  ruleIndex: number;
  start: Token;
}

interface FollowSetWithPath {
  symbols: number[];
  path: RuleList;
  /** For each rule of `path`, the ATN state that called it. */
  invokingStates: number[];
  following: TokenList;
}

interface FollowSetsHolder {
  sets: FollowSetWithPath[];
  combined: Set<number>;
  isExhaustive: boolean;
}

interface PipelineEntry {
  state: RuntimeAtnState;
  tokenListIndex: number;
}

type RuleEndStatus = Set<number>;

const toSymbols = (set: RuntimeIntervalSet | null): number[] => {
  const symbols: number[] = [];
  for (const { start, stop } of set?.intervals ?? []) {
    for (let symbol = start; symbol < stop; symbol++) {
      symbols.push(symbol);
    }
  }
  return symbols;
};

const longestCommonPrefix = (a: TokenList, b: TokenList | undefined): TokenList => {
  if (!b) {
    return [];
  }
  let index = 0;
  while (index < Math.min(a.length, b.length) && a[index] === b[index]) {
    index++;
  }
  return a.slice(0, index);
};

const createCandidates = (): CandidatesCollection => ({
  tokens: new Map(),
  tokenCallStacks: new Map(),
  rules: new Map(),
  startRuleCanEndAtCaret: false,
});

// Follow sets depend only on the ATN, so they are shared by all instances. As in c3, a predicate
// is evaluated once for them, which assumes grammar capabilities do not change at runtime.
const followSetsByAtn = new WeakMap<RuntimeAtn, Map<number, FollowSetsHolder>>();

/** Collects the grammar's token and rule candidates at a caret token. */
export class CodeCompletionCore {
  /** Tokens that never appear in the candidates. */
  public ignoredTokens = new Set<number>();

  /** Rules reported instead of the tokens they contain. */
  public preferredRules = new Set<number>();

  /** Prefer the innermost preferred rule of a call stack instead of the outermost. */
  public translateRulesTopDown = false;

  private readonly atn: RuntimeAtn;
  private tokens: Token[] = [];
  private precedenceStack: number[] = [];
  /**
   * Where a rule's walk from a token can end, by rule as in c3. Unlike c3, a walk that reached
   * the caret is not reused, so that each call records its candidates under its own call stack,
   * as both RENAME names at `RENAME a.`. Left-recursive rules, which call themselves from
   * several states at one token, are reused anyway: their calls are not told apart.
   */
  private shortcutMap = new Map<number, Map<number, RuleEndStatus>>();
  /** How many times a walk reached the caret. */
  private caretVisits = 0;
  private candidates = createCandidates();

  constructor(private readonly parser: EsqlParser, private readonly tokenStream: TokenSource) {
    this.atn = getRuntimeAtn(parser);
  }

  /**
   * Collects candidates for the token at `caretTokenIndex`. With `start`, the walk begins at
   * that rule and token instead of the grammar's first rule, which is faster but only finds
   * candidates reachable from it.
   */
  public collectCandidates(caretTokenIndex: number, start?: CollectionStart): CandidatesCollection {
    this.shortcutMap = new Map();
    this.candidates = createCandidates();
    this.precedenceStack = [];
    this.tokens = [];

    let offset = start ? start.start.tokenIndex : 0;
    while (true) {
      const token = this.tokenStream.get(offset++);
      if (!token) {
        break;
      }
      if (token.channel === Token.DEFAULT_CHANNEL) {
        this.tokens.push(token);
        if (token.tokenIndex >= caretTokenIndex || token.type === Token.EOF) {
          break;
        }
      }
      if (token.type === Token.EOF) {
        break;
      }
    }

    if (!this.tokens.length) {
      return this.candidates;
    }

    const startRule = start ? start.ruleIndex : 0;
    const endStatus = this.processRule(this.atn.ruleToStartState[startRule], 0, [], 0);
    this.candidates.startRuleCanEndAtCaret = endStatus.has(this.tokens.length - 1);

    return this.candidates;
  }

  private checkPredicate(transition: RuntimeTransition): boolean {
    return transition.getPredicate?.().evaluate(this.parser, null) ?? true;
  }

  private translateStackToRuleIndex(stack: RuleWithStartToken[]): boolean {
    this.caretVisits++;
    if (this.preferredRules.size === 0) {
      return false;
    }

    if (this.translateRulesTopDown) {
      for (let i = stack.length - 1; i >= 0; i--) {
        if (this.translateToRuleIndex(i, stack)) {
          return true;
        }
      }
    } else {
      for (let i = 0; i < stack.length; i++) {
        if (this.translateToRuleIndex(i, stack)) {
          return true;
        }
      }
    }

    return false;
  }

  private translateToRuleIndex(i: number, stack: RuleWithStartToken[]): boolean {
    const { ruleIndex, startTokenIndex, invokingState } = stack[i];
    if (!this.preferredRules.has(ruleIndex)) {
      return false;
    }

    const callStack = stack.slice(0, i);
    const path = callStack.map((entry) => entry.ruleIndex);
    const candidates = this.candidates.rules.get(ruleIndex) ?? [];
    const known = candidates.some(
      (candidate) =>
        candidate.invokingState === invokingState &&
        candidate.ruleList.length === path.length &&
        path.every((value, j) => value === candidate.ruleList[j])
    );

    // Unlike c3, which keeps one candidate per rule, every call path is kept.
    if (!known) {
      this.candidates.rules.set(ruleIndex, [
        ...candidates,
        { startTokenIndex, ruleList: path, callStack, invokingState },
      ]);
    }

    return true;
  }

  /** Single-token transitions that directly follow `transition` within the same rule. */
  private getFollowingTokens(transition: RuntimeTransition): TokenList {
    const result: TokenList = [];
    const pipeline: RuntimeAtnState[] = [transition.target];

    while (pipeline.length > 0) {
      const state = pipeline.pop();
      for (const outgoing of state?.transitions ?? []) {
        if (outgoing.serializationType !== TransitionType.ATOM) {
          continue;
        }
        if (outgoing.isEpsilon) {
          pipeline.push(outgoing.target);
          continue;
        }
        const symbols = toSymbols(outgoing.label);
        if (symbols.length === 1 && !this.ignoredTokens.has(symbols[0])) {
          result.push(symbols[0]);
          pipeline.push(outgoing.target);
        }
      }
    }

    return result;
  }

  private determineFollowSets(start: RuntimeAtnState, stop: RuntimeAtnState): FollowSetsHolder {
    const sets: FollowSetWithPath[] = [];
    const isExhaustive = this.collectFollowSets(start, stop, sets, [], [], []);
    const combined = new Set<number>();
    for (const { symbols } of sets) {
      for (const symbol of symbols) {
        combined.add(symbol);
      }
    }
    return { sets, isExhaustive, combined };
  }

  private allUserTokens(): number[] {
    const symbols: number[] = [];
    for (let symbol = MIN_USER_TOKEN_TYPE; symbol <= this.atn.maxTokenType; symbol++) {
      symbols.push(symbol);
    }
    return symbols;
  }

  /**
   * Collects the tokens that can follow `state`, like the runtime's LL1Analyzer but evaluating
   * predicates. Returns true when the set is exhaustive (the walk did not reach the rule end).
   */
  private collectFollowSets(
    state: RuntimeAtnState,
    stopState: RuntimeAtnState,
    followSets: FollowSetWithPath[],
    stateStack: RuntimeAtnState[],
    ruleStack: number[],
    invokingStates: number[]
  ): boolean {
    if (stateStack.includes(state)) {
      return true;
    }
    stateStack.push(state);

    if (state === stopState || state.stateType === RULE_STOP_STATE_TYPE) {
      stateStack.pop();
      return false;
    }

    let isExhaustive = true;
    for (const transition of state.transitions) {
      const { serializationType: type } = transition;

      if (type === TransitionType.RULE) {
        if (ruleStack.includes(transition.target.ruleIndex)) {
          continue;
        }

        ruleStack.push(transition.target.ruleIndex);
        invokingStates.push(state.stateNumber);
        const ruleIsExhaustive = this.collectFollowSets(
          transition.target,
          stopState,
          followSets,
          stateStack,
          ruleStack,
          invokingStates
        );
        ruleStack.pop();
        invokingStates.pop();

        // The subrule can be passed without consuming input, so continue after it.
        if (!ruleIsExhaustive && transition.followState) {
          const nextIsExhaustive = this.collectFollowSets(
            transition.followState,
            stopState,
            followSets,
            stateStack,
            ruleStack,
            invokingStates
          );
          isExhaustive = isExhaustive && nextIsExhaustive;
        }
      } else if (type === TransitionType.PREDICATE) {
        if (this.checkPredicate(transition)) {
          const nextIsExhaustive = this.collectFollowSets(
            transition.target,
            stopState,
            followSets,
            stateStack,
            ruleStack,
            invokingStates
          );
          isExhaustive = isExhaustive && nextIsExhaustive;
        }
      } else if (transition.isEpsilon) {
        const nextIsExhaustive = this.collectFollowSets(
          transition.target,
          stopState,
          followSets,
          stateStack,
          ruleStack,
          invokingStates
        );
        isExhaustive = isExhaustive && nextIsExhaustive;
      } else if (type === TransitionType.WILDCARD) {
        followSets.push({
          symbols: this.allUserTokens(),
          path: ruleStack.slice(),
          invokingStates: invokingStates.slice(),
          following: [],
        });
      } else {
        let symbols = toSymbols(transition.label);
        if (symbols.length > 0) {
          if (type === TransitionType.NOT_SET) {
            const excluded = new Set(symbols);
            symbols = this.allUserTokens().filter((symbol) => !excluded.has(symbol));
          }
          followSets.push({
            symbols,
            path: ruleStack.slice(),
            invokingStates: invokingStates.slice(),
            following: this.getFollowingTokens(transition),
          });
        }
      }
    }
    stateStack.pop();

    return isExhaustive;
  }

  private getFollowSets(startState: RuntimeAtnState): FollowSetsHolder {
    let setsPerState = followSetsByAtn.get(this.atn);
    if (!setsPerState) {
      setsPerState = new Map();
      followSetsByAtn.set(this.atn, setsPerState);
    }

    let followSets = setsPerState.get(startState.stateNumber);
    if (!followSets) {
      followSets = this.determineFollowSets(
        startState,
        this.atn.ruleToStopState[startState.ruleIndex]
      );
      setsPerState.set(startState.stateNumber, followSets);
    }

    return followSets;
  }

  private recordTokenCallStack(symbol: number, callStack: RuleWithStartToken[]) {
    if (!this.candidates.tokenCallStacks.has(symbol)) {
      this.candidates.tokenCallStacks.set(symbol, callStack.slice());
    }
  }

  private addTokenCandidate(
    symbol: number,
    following: TokenList,
    merge: 'reset' | 'prefix',
    callStack: RuleWithStartToken[]
  ) {
    this.recordTokenCallStack(symbol, callStack);
    const existing = this.candidates.tokens.get(symbol);
    if (!existing) {
      this.candidates.tokens.set(symbol, following);
    } else if (merge === 'prefix') {
      this.candidates.tokens.set(symbol, longestCommonPrefix(following, existing));
    } else if (existing !== following) {
      // More than one following list for the same symbol.
      this.candidates.tokens.set(symbol, []);
    }
  }

  /**
   * Walks the ATN of a single rule and returns the token list positions at which the rule can
   * end. The result is empty when no path matches the input or the caret was reached.
   */
  private processRule(
    startState: RuntimeAtnState,
    tokenListIndex: number,
    callStack: RuleWithStartToken[],
    precedence: number,
    invokingState?: number
  ): RuleEndStatus {
    let positionMap = this.shortcutMap.get(startState.ruleIndex);
    if (!positionMap) {
      positionMap = new Map();
      this.shortcutMap.set(startState.ruleIndex, positionMap);
    } else {
      const cached = positionMap.get(tokenListIndex);
      if (cached) {
        return cached;
      }
    }

    const result: RuleEndStatus = new Set();
    const caretVisitsBefore = this.caretVisits;
    const followSets = this.getFollowSets(startState);
    const startTokenIndex = this.tokens[tokenListIndex].tokenIndex;

    callStack.push({ startTokenIndex, ruleIndex: startState.ruleIndex, invokingState });

    if (tokenListIndex >= this.tokens.length - 1) {
      // At the caret: report the rule's follow set, translated to preferred rules where possible.
      if (this.preferredRules.has(startState.ruleIndex)) {
        this.translateStackToRuleIndex(callStack);
      } else {
        for (const set of followSets.sets) {
          const fullPath = callStack.slice();
          set.path.forEach((ruleIndex, index) => {
            fullPath.push({ startTokenIndex, ruleIndex, invokingState: set.invokingStates[index] });
          });

          if (!this.translateStackToRuleIndex(fullPath)) {
            for (const symbol of set.symbols) {
              if (!this.ignoredTokens.has(symbol)) {
                this.addTokenCandidate(symbol, set.following, 'reset', fullPath);
              }
            }
          }
        }
      }

      // A non-exhaustive follow set means the rule can also end here.
      if (!followSets.isExhaustive) {
        result.add(tokenListIndex);
      }

      callStack.pop();
      return result;
    }

    // Skip the rule when the current token cannot start it and it cannot be passed empty.
    const symbolAtEntry = this.tokens[tokenListIndex].type;
    if (followSets.isExhaustive && !followSets.combined.has(symbolAtEntry)) {
      callStack.pop();
      return result;
    }

    if (startState.isPrecedenceRule) {
      this.precedenceStack.push(precedence);
    }

    const pipeline: PipelineEntry[] = [{ state: startState, tokenListIndex }];

    while (pipeline.length > 0) {
      const entry = pipeline.pop();
      if (!entry) {
        break;
      }

      const currentSymbol = this.tokens[entry.tokenListIndex].type;
      const atCaret = entry.tokenListIndex >= this.tokens.length - 1;

      if (entry.state.stateType === RULE_STOP_STATE_TYPE) {
        result.add(entry.tokenListIndex);
        continue;
      }

      for (const transition of entry.state.transitions) {
        switch (transition.serializationType) {
          case TransitionType.RULE: {
            const endStatus = this.processRule(
              transition.target,
              entry.tokenListIndex,
              callStack,
              transition.precedence ?? 0,
              entry.state.stateNumber
            );
            if (transition.followState) {
              for (const position of endStatus) {
                pipeline.push({ state: transition.followState, tokenListIndex: position });
              }
            }
            break;
          }

          case TransitionType.PREDICATE: {
            if (this.checkPredicate(transition)) {
              pipeline.push({ state: transition.target, tokenListIndex: entry.tokenListIndex });
            }
            break;
          }

          case TransitionType.PRECEDENCE: {
            const current = this.precedenceStack[this.precedenceStack.length - 1];
            if (current !== undefined && (transition.precedence ?? 0) >= current) {
              pipeline.push({ state: transition.target, tokenListIndex: entry.tokenListIndex });
            }
            break;
          }

          case TransitionType.WILDCARD: {
            if (!atCaret) {
              pipeline.push({ state: transition.target, tokenListIndex: entry.tokenListIndex + 1 });
            } else if (!this.translateStackToRuleIndex(callStack)) {
              for (const symbol of this.allUserTokens()) {
                if (!this.ignoredTokens.has(symbol)) {
                  this.recordTokenCallStack(symbol, callStack);
                  this.candidates.tokens.set(symbol, []);
                }
              }
            }
            break;
          }

          default: {
            if (transition.isEpsilon) {
              pipeline.push({ state: transition.target, tokenListIndex: entry.tokenListIndex });
              continue;
            }

            const { label } = transition;
            if (!label?.intervals?.length) {
              break;
            }
            const isNotSet = transition.serializationType === TransitionType.NOT_SET;

            if (!atCaret) {
              const inLabel = label.contains(currentSymbol);
              const matches = isNotSet
                ? !inLabel &&
                  currentSymbol >= MIN_USER_TOKEN_TYPE &&
                  currentSymbol <= this.atn.maxTokenType
                : inLabel;
              if (matches) {
                pipeline.push({
                  state: transition.target,
                  tokenListIndex: entry.tokenListIndex + 1,
                });
              }
              break;
            }

            let symbols = toSymbols(label);
            if (isNotSet) {
              const excluded = new Set(symbols);
              symbols = this.allUserTokens().filter((symbol) => !excluded.has(symbol));
            }

            if (!this.translateStackToRuleIndex(callStack)) {
              const hasTokenSequence = symbols.length === 1;
              for (const symbol of symbols) {
                if (!this.ignoredTokens.has(symbol)) {
                  const following = hasTokenSequence ? this.getFollowingTokens(transition) : [];
                  this.addTokenCandidate(symbol, following, 'prefix', callStack);
                }
              }
            }
          }
        }
      }
    }

    callStack.pop();
    if (startState.isPrecedenceRule) {
      this.precedenceStack.pop();
    }

    if (startState.isPrecedenceRule || this.caretVisits === caretVisitsBefore) {
      positionMap.set(tokenListIndex, result);
    }

    return result;
  }
}
