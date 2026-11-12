/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISuggestionItem } from '../../commands/registry/types';
import { describeScenarios, runScenario } from './run';
import type { ScenarioTable, SuggestFlow } from './types';

const item = (text: string, properties: Partial<ISuggestionItem> = {}): ISuggestionItem => ({
  label: text,
  text,
  kind: 'Keyword',
  detail: '',
  ...properties,
});

const createFlow = (
  name: string,
  items: ISuggestionItem[],
  runsNewRows = false
): SuggestFlow & { suggest: jest.Mock } => ({
  name,
  suggest: jest.fn(async () => items),
  runsNewRows,
});

describe('runScenario', () => {
  test('places the cursor between the query and the text after it', async () => {
    const flow = createFlow('fake', []);

    await runScenario(
      { name: 'cursor', query: 'FROM a | LIMIT ', after: ' | KEEP b', expect: {} },
      flow
    );

    expect(flow.suggest).toHaveBeenCalledWith('FROM a | LIMIT  | KEEP b', 15, expect.any(Object));
  });

  test('answers the callbacks from the scenario world', async () => {
    const flow = createFlow('fake', []);

    await runScenario(
      {
        name: 'world',
        query: 'FROM a | ',
        world: { columns: [{ name: 'onlyColumn', type: 'keyword', userDefined: false }] },
        expect: {},
      },
      flow
    );

    const [, , callbacks] = flow.suggest.mock.calls[0];

    expect(await callbacks.getColumnsFor({ query: 'FROM a' })).toEqual([
      { name: 'onlyColumn', type: 'keyword', userDefined: false },
    ]);
  });
});

const table: ScenarioTable = {
  command: 'fake',
  scenarios: [
    {
      name: 'matches the exact texts in any order',
      query: 'FAKE ',
      expect: { exact: ['b ', 'a ', 'SNIPPET($0)'] },
    },
    {
      group: 'partial expectations',
      name: 'matches present and absent texts',
      query: 'FAKE ',
      expect: { contains: ['a '], excludes: ['c '] },
    },
    {
      group: 'partial expectations',
      name: 'matches item properties',
      query: 'FAKE ',
      expect: { contains: [{ text: 'SNIPPET($0)', asSnippet: true }] },
    },
  ],
};

const newRow: ScenarioTable = {
  command: 'fake',
  scenarios: [
    {
      name: 'is a behaviour only the new flow has',
      query: 'FAKE ',
      status: 'new',
      expect: { exact: ['a ', 'b ', 'SNIPPET($0)'] },
    },
  ],
};

const items = [item('a '), item('b '), item('SNIPPET($0)', { asSnippet: true })];

describeScenarios(table, [createFlow('first', items), createFlow('second', items)]);

// The row would fail on the old flow, so it passing here shows it only ran on the new one.
describeScenarios(newRow, [createFlow('old', []), createFlow('new', items, true)]);
