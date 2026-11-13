/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from '@elastic/esql';
import { Token, type ParserRuleContext, type ParseTree, type TerminalNode } from 'antlr4';
import { getCommandRuleNames, getTokenName } from '../cursor_location/cursor_location';
import { PREFERRED_RULES } from '../cursor_location/grammar_rules';
import { callSiteId } from './call_site_id';
import { classifyToken, isExpressionRule } from './token_classes';
import type { WrittenAncestor, WrittenArgument, WrittenCommand } from './types';

/** The contexts above a node, below its command, with the rule names the ids are built from. */
interface Scope {
  command: WrittenCommand;
  ancestors: WrittenAncestor[];
  /** The rules from the command down to the current context. */
  rules: string[];
}

// Every generated context has its rule index, which the base typing leaves out.
type RuleContext = ParserRuleContext & { ruleIndex: number };

const preferredRules: readonly string[] = PREFERRED_RULES;

const isRuleContext = (node: ParseTree): node is RuleContext =>
  (node as RuleContext).ruleIndex !== undefined;

const isTerminal = (node: ParseTree): node is TerminalNode =>
  (node as TerminalNode).symbol !== undefined;

/** The offsets a context covers. A context that matched nothing is empty at its start. */
const rangeOf = ({ start, stop }: ParserRuleContext): { start: number; end: number } => {
  const from = start?.start ?? 0;
  const end = stop && stop.stop + 1 >= from ? stop.stop + 1 : from;

  return { start: from, end };
};

/**
 * Describes what is written in each command of a query: every argument and token, with the
 * grammar call site that takes it. It reads the parse tree only, so it needs no cursor and
 * gives the same ids as `locate` gives for the arguments it expects.
 */
export const describeCommands = (text: string): WrittenCommand[] => {
  const { parser } = Parser.create(text);
  parser.removeErrorListeners();
  const tree = parser.statements();
  const { ruleNames } = parser;
  const commandRules = getCommandRuleNames();
  const commands: WrittenCommand[] = [];

  const visit = (context: RuleContext, scope: Scope | undefined, enclosing: string[]) => {
    const rule = ruleNames[context.ruleIndex];
    let current = scope;
    let around = enclosing;

    if (commandRules.includes(rule)) {
      const command: WrittenCommand = {
        rule,
        ...rangeOf(context),
        enclosingCommands: enclosing,
        arguments: [],
      };
      commands.push(command);
      current = { command, ancestors: [], rules: [rule] };
      around = [...enclosing, rule];
    }

    // How many children with the same call site came before, as the items of a list.
    const seen = new Map<string, number>();
    const nextIndex = (id: string): number => {
      const index = seen.get(id) ?? 0;
      seen.set(id, index + 1);

      return index;
    };

    for (const child of context.children ?? []) {
      if (isRuleContext(child)) {
        const childRule = ruleNames[child.ruleIndex];

        if (!current || commandRules.includes(childRule)) {
          visit(child, current, around);
          continue;
        }

        const id = callSiteId(rule, childRule, child.invokingState);
        const index = nextIndex(id);
        const range = rangeOf(child);

        if (preferredRules.includes(childRule)) {
          current.command.arguments.push({
            id,
            kind: 'rule',
            rule: childRule,
            text: text.slice(range.start, range.end),
            ...range,
            index,
            ancestors: current.ancestors,
            complete: !child.exception,
          });
        } else {
          visit(
            child,
            {
              command: current.command,
              ancestors: [...current.ancestors, { id, index, ...range }],
              rules: [...current.rules, childRule],
            },
            around
          );
        }
      } else if (isTerminal(child) && current) {
        const { type, start, stop } = child.symbol;

        // An error node stands for a token the parser made up or could not place.
        if (
          type === Token.EOF ||
          stop < start ||
          (child as { isErrorNode?: unknown }).isErrorNode
        ) {
          continue;
        }

        const token = getTokenName(type);
        const id = `${rule}>${token}`;
        const argument: WrittenArgument = {
          id,
          kind: 'token',
          token,
          class: classifyToken(type, current.rules.slice(1).some(isExpressionRule)),
          text: text.slice(start, stop + 1),
          start,
          end: stop + 1,
          index: nextIndex(id),
          ancestors: current.ancestors,
          complete: true,
        };
        current.command.arguments.push(argument);
      }
    }
  };

  visit(tree, undefined, []);

  return commands;
};
