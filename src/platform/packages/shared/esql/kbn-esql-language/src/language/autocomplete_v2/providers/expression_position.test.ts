/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readdirSync } from 'fs';
import { join } from 'path';
import { runScenario, SUGGEST_FLOWS } from '../../../__tests__/scenarios';
import type { ScenarioTable } from '../../../__tests__/scenarios';
import { getExpressionEntry, resolveRole } from '../../../esql_js_sim/definitions';
import { locate } from '../../../esql_js_sim/grammar';
import { describeExpressionPosition, type ExpressionPosition } from './expression_position';

/** What the expression engine of the current flow worked out, at the innermost level. */
interface EngineFacts {
  position: string;
  functionName?: string;
  argument?: number;
  start?: number;
}

const mockEngineCalls: EngineFacts[] = [];

// The engine of the current flow tells where it thinks the cursor is by the handler it picks.
jest.mock(
  '../../../commands/definitions/utils/autocomplete/expressions/positions/dispatcher',
  () => {
    const actual = jest.requireActual(
      '../../../commands/definitions/utils/autocomplete/expressions/positions/dispatcher'
    );

    return {
      ...actual,
      dispatchStates: (
        ctx: {
          expressionRoot?: { location?: { min: number } };
          options: {
            functionParameterContext?: {
              functionDefinition?: { name: string };
              currentParameterIndex: number;
            };
          };
        },
        position: string
      ) => {
        mockEngineCalls.push({
          position,
          functionName: ctx.options.functionParameterContext?.functionDefinition?.name,
          argument: ctx.options.functionParameterContext?.currentParameterIndex,
          start: ctx.expressionRoot?.location?.min,
        });

        return actual.dispatchStates(ctx, position);
      },
    };
  }
);

const REGISTRY_DIR = join(__dirname, '../../../commands/registry');

// The engine's names for the positions the grammar gives.
const ENGINE_POSITIONS: Record<string, string> = {
  empty: 'empty_expression',
  after_not: 'after_not',
  after_cast: 'after_cast',
  after_operand: 'after_complete',
  after_operator: 'after_operator',
};
// The operators the engine handles before it picks a position, while their right side is missing.
const HANDLED_APART: readonly string[] = ['is', 'in', 'like', 'rlike', 'not'];

const loadTables = (): ScenarioTable[] =>
  readdirSync(REGISTRY_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap(({ name }) => {
      try {
        const exported: Record<string, ScenarioTable> = jest.requireActual(
          join(REGISTRY_DIR, name, 'autocomplete.scenarios.ts')
        );

        return Object.values(exported);
      } catch (error) {
        return [];
      }
    });

const compare = (engine: EngineFacts | undefined, grammar: ExpressionPosition): string => {
  if (!engine) {
    if (grammar.kind === 'in_string' || grammar.kind === 'in_map') {
      return 'agree: in a string or a map, which the engine handles apart';
    }

    return HANDLED_APART.includes(grammar.operator ?? '')
      ? 'agree: after IS, IN or LIKE, which the engine handles apart'
      : 'not comparable: the command did not ask the engine';
  }
  // The engine stops at a call of a function it does not know.
  if (engine.position === 'in_function' && grammar.call) {
    return 'agree: in a call of an unknown function';
  }

  const differences = [
    engine.position !== ENGINE_POSITIONS[grammar.kind] && 'position',
    engine.functionName !== grammar.call?.name && 'function',
    engine.argument !== grammar.call?.argument && 'argument',
    // Where nothing is written, or right after NOT, the engine is handed no start.
    !['empty_expression', 'after_not'].includes(engine.position) &&
      engine.start !== grammar.start &&
      'start',
  ].filter(Boolean);

  return differences.length
    ? `differ: ${differences.join(', ')}`
    : 'agree: same position, function, argument and start';
};

/**
 * Whether the grammar position alone says where the cursor is inside an expression, measured
 * against the expression engine of the current flow. That engine works it out from the syntax
 * tree and the text; `describeExpressionPosition` reads neither. Every row of every scenario
 * table runs through the current flow, and what its engine concluded is compared with what the
 * grammar gives. The counts and the rows that differ are kept in a snapshot.
 */
describe('the position inside an expression, from the grammar alone', () => {
  it('agrees with the expression engine of the current flow', async () => {
    const [currentFlow] = SUGGEST_FLOWS;
    const counts: Record<string, number> = {};
    const differing: string[] = [];

    for (const { command, scenarios } of loadTables()) {
      for (const scenario of scenarios.filter(({ status }) => status !== 'new')) {
        mockEngineCalls.length = 0;
        // Rows on which the current flow throws tell nothing about a position.
        await runScenario(scenario, currentFlow).catch(() => []);

        const engine = mockEngineCalls.at(-1);
        const ir = locate(scenario.query + (scenario.after ?? ''), scenario.query.length);
        const [entry] = [...ir.arguments, ...ir.followers].flatMap(({ path }) => {
          const candidate = getExpressionEntry(path);

          return candidate && resolveRole(path)?.role.kind === 'expression' ? [candidate] : [];
        });

        if (!entry) {
          const outcome = engine
            ? 'not comparable: the engine ran where the signature has no expression'
            : 'agree: no expression at the cursor';
          counts[outcome] = (counts[outcome] ?? 0) + 1;
          continue;
        }

        const outcome = compare(engine, describeExpressionPosition(ir, entry));
        counts[outcome] = (counts[outcome] ?? 0) + 1;

        if (outcome.startsWith('differ')) {
          differing.push(`[${command}] ${scenario.query}▮${scenario.after ?? ''} (${outcome})`);
        }
      }
    }

    expect({ counts, differing }).toMatchSnapshot();
  });
});
