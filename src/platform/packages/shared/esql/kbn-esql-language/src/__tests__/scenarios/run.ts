/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { countBy, groupBy, uniq } from 'lodash';
// The package entry point, as the editor imports it. Loading it first also keeps the module
// order of the package: its index has to be evaluated before the modules that import from it.
import { suggest } from '../../..';
import { setTestFunctions } from '../../commands/definitions/utils/test_functions';
import type { ISuggestionItem } from '../../commands/registry/types';
import type {
  ExpectedSuggestion,
  Scenario,
  ScenarioExpectation,
  ScenarioTable,
  SuggestFlow,
} from './types';
import { createCallbacks } from './world';

/** The flows every scenario table runs against. The parity check is this list having two entries. */
export const SUGGEST_FLOWS: readonly SuggestFlow[] = [
  { name: 'current', suggest, runsNewRows: false },
];

const UNGROUPED = '';

// Matches the common Monaco placeholders: $0, $1 and ${1:placeholder}.
const SNIPPET_PLACEHOLDER = /\$(\d+|\{\d+:[^}]*\})/;

const textOf = (expected: ExpectedSuggestion): string =>
  typeof expected === 'string' ? expected : expected.text;

const sortedTexts = (expected: readonly ExpectedSuggestion[]): string[] =>
  uniq(expected.map(textOf)).sort();

const assertItemProperties = (
  suggestions: ISuggestionItem[],
  expected: readonly ExpectedSuggestion[]
): void => {
  for (const item of expected) {
    if (typeof item !== 'string') {
      const suggestion = suggestions.find(({ text }) => text === item.text);

      expect(suggestion).toEqual(expect.objectContaining(item));
    }
  }
};

const assertExpectation = (
  suggestions: ISuggestionItem[],
  { exact, contains, excludes, containsLabels, excludesLabels, uniqueLabels }: ScenarioExpectation
): void => {
  const texts = suggestions.map(({ text }) => text);
  const labels = suggestions.map(({ label }) => label);

  for (const { text, asSnippet } of suggestions) {
    if (SNIPPET_PLACEHOLDER.test(text) && !asSnippet) {
      throw new Error(`A suggestion with a placeholder must be marked as a snippet: ${text}`);
    }
  }

  if (exact) {
    expect([...texts].sort()).toEqual(sortedTexts(exact));
    assertItemProperties(suggestions, exact);
  }

  if (contains) {
    expect(texts).toEqual(expect.arrayContaining(sortedTexts(contains)));
    assertItemProperties(suggestions, contains);
  }

  if (excludes) {
    expect(texts.filter((text) => excludes.includes(text))).toEqual([]);
  }

  if (containsLabels) {
    expect(labels).toEqual(expect.arrayContaining([...containsLabels]));
  }

  if (excludesLabels) {
    expect(labels.filter((label) => excludesLabels.includes(label))).toEqual([]);
  }

  if (uniqueLabels) {
    const counts = countBy(labels);

    expect(Object.keys(counts).filter((label) => counts[label] > 1)).toEqual([]);
  }
};

/** Runs one scenario through a flow's `suggest` and returns the suggestions. */
export const runScenario = async (
  { query, after = '', world, testFunctions = [] }: Scenario,
  flow: SuggestFlow
): Promise<ISuggestionItem[]> => {
  setTestFunctions([...testFunctions]);

  try {
    return await flow.suggest(query + after, query.length, createCallbacks(world));
  } finally {
    setTestFunctions([]);
  }
};

/** Declares one test per scenario and flow. */
export const describeScenarios = (
  { command, scenarios }: ScenarioTable,
  flows: readonly SuggestFlow[] = SUGGEST_FLOWS
): void => {
  const groups = groupBy(scenarios, ({ group }) => group ?? UNGROUPED);

  describe.each(flows.map((flow) => [flow.name, flow] as const))(
    `${command.toUpperCase()} autocomplete scenarios (%s flow)`,
    (_flowName, flow) => {
      const declare = (scenario: Scenario): void => {
        const declareTest = scenario.status === 'new' && !flow.runsNewRows ? test.skip : test;

        declareTest(`${scenario.name}: ${scenario.query}▮${scenario.after ?? ''}`, async () => {
          assertExpectation(await runScenario(scenario, flow), scenario.expect);
        });
      };

      for (const [group, groupScenarios] of Object.entries(groups)) {
        if (group === UNGROUPED) {
          groupScenarios.forEach(declare);
        } else {
          describe(group, () => groupScenarios.forEach(declare));
        }
      }
    }
  );
};
