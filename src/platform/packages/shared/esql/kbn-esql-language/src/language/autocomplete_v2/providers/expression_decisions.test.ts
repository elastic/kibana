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
import { createCallbacks, runScenario } from '../../../__tests__/scenarios';
import type { ScenarioTable, SuggestFlow } from '../../../__tests__/scenarios';
import { suggest } from '../suggest';
import { DECIDED_KINDS } from './expression_decisions';

const mockEngineCalls: string[] = [];

// Counts the calls to the expression engine of the current flow: a decided position makes none.
jest.mock('../../../commands/definitions/utils', () => {
  const actual = jest.requireActual('../../../commands/definitions/utils');

  return {
    ...actual,
    suggestForExpression: (params: { query: string }) => {
      mockEngineCalls.push(params.query);

      return actual.suggestForExpression(params);
    },
  };
});

const REGISTRY_DIR = join(__dirname, '../../../commands/registry');
const newFlow: SuggestFlow = { name: 'v2', suggest, runsNewRows: true };

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

/**
 * The rows where the decisions are right to differ. After a keyword of the command typed in
 * full, the current engine is handed the node of the whole sort order and offers operands
 * again; the expression has ended there, so the decisions offer nothing of it.
 */
const ACCEPTED_DIFFERENCES = [
  '[sort] from a | sort keywordField ASC▮',
  '[sort] from a | sort keywordField asc▮',
  '[sort] from a | sort keywordField desc▮',
  '[sort] from a | sort keywordField nulls▮',
];

const callbacks = createCallbacks({
  columns: [
    { name: 'k', type: 'keyword', userDefined: false },
    { name: 'n', type: 'long', userDefined: false },
  ],
});

const engineCallsAt = async (query: string): Promise<number> => {
  mockEngineCalls.length = 0;
  await suggest(query, query.length, callbacks);

  return mockEngineCalls.length;
};

describe('expression decisions', () => {
  it('decides the start of an expression without the engine of the current flow', async () => {
    expect(await engineCallsAt('FROM d | WHERE ')).toBe(0);
    expect(await engineCallsAt('FROM d | EVAL a = ')).toBe(0);
    expect(await engineCallsAt('FROM d | SORT k')).toBe(0);
  });

  it('decides what follows a complete operand without that engine', async () => {
    expect(await engineCallsAt('FROM d | WHERE n ')).toBe(0);
    expect(await engineCallsAt('FROM d | EVAL a = ABS(n) ')).toBe(0);
    expect(await engineCallsAt('FROM d | WHERE k IS NULL ')).toBe(0);
  });

  it('still asks that engine at the positions that are not moved yet', async () => {
    expect(await engineCallsAt('FROM d | WHERE n > ')).toBe(1);
    expect(await engineCallsAt('FROM d | WHERE ABS(')).toBe(1);
  });

  /**
   * The guard for moving a position: on every row of every scenario table, the flow offers
   * the same items with the decided positions as it does when every position goes to the
   * engine of the current flow.
   */
  it('offers what the engine of the current flow offers, on every scenario row', async () => {
    const decided = [...DECIDED_KINDS];
    const differing: string[] = [];
    let served = 0;

    for (const { command, scenarios } of loadTables()) {
      for (const scenario of scenarios) {
        const texts = async (): Promise<string[]> =>
          (await runScenario(scenario, newFlow).catch(() => []))
            .map(({ label, text }) => `${label}|${text}`)
            .sort();

        mockEngineCalls.length = 0;
        const withDecisions = await texts();
        const engineCalls = mockEngineCalls.length;

        DECIDED_KINDS.clear();
        mockEngineCalls.length = 0;
        const withEngine = await texts();
        served += mockEngineCalls.length > engineCalls ? 1 : 0;
        decided.forEach((kind) => DECIDED_KINDS.add(kind));

        if (withDecisions.join('\n') !== withEngine.join('\n')) {
          differing.push(`[${command}] ${scenario.query}▮${scenario.after ?? ''}`);
        }
      }
    }

    expect(differing).toEqual(ACCEPTED_DIFFERENCES);
    // The rows the decisions serve alone. The number grows as positions are moved.
    expect(served).toMatchInlineSnapshot(`152`);
  });
});
