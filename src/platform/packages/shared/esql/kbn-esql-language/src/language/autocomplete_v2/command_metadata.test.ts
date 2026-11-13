/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esqlCommandRegistry } from '../../commands/registry';
import {
  EXPRESSION_POSITIONS,
  getCommandStarts,
  getGrammarPositions,
} from '../../esql_js_sim/grammar';
import { getRegisteredCommand } from './command_metadata';

const commandRules = Object.keys(getCommandStarts());
const positions = getGrammarPositions();

const describePositions = (command: string): string[] =>
  positions
    .filter((position) => position.command === command)
    .map(({ kind, path, takes }) => `${kind}: ${path.join(' / ')} -> ${takes}`)
    .sort();

describe('getRegisteredCommand', () => {
  it('finds the command Kibana registered for a grammar rule', () => {
    expect(getRegisteredCommand('whereCommand')?.name).toBe('where');
    expect(getRegisteredCommand('timeSeriesCommand')?.name).toBe('ts');
  });

  it('finds a command that starts with one of its types', () => {
    expect(getRegisteredCommand('joinCommand')?.name).toBe('join');
  });

  it('finds a command whose name is typed as two words', () => {
    expect(getRegisteredCommand('inlineStatsCommand')?.name).toBe('inline stats');
  });

  it('is undefined for a command Kibana has not registered', () => {
    expect(getRegisteredCommand('fillNullCommand')).toBeUndefined();
  });

  it('gives every registered command exactly one grammar rule', () => {
    const rulesByName = new Map<string, string[]>();
    for (const rule of commandRules) {
      const name = getRegisteredCommand(rule)?.name;
      if (name) {
        rulesByName.set(name, [...(rulesByName.get(name) ?? []), rule]);
      }
    }

    const withoutOneRule = esqlCommandRegistry
      .getAllCommandNames()
      .filter((name) => rulesByName.get(name)?.length !== 1);

    expect(withoutOneRule).toEqual([]);
  });
});

describe('the positions of the grammar', () => {
  // A command in this list is in the grammar and Kibana has not adopted it. Its positions need
  // no meaning yet. The list changes when the grammar adds a command or Kibana registers one.
  it('keeps the commands Kibana has not registered apart', () => {
    const notRegistered = commandRules.filter((rule) => !getRegisteredCommand(rule)).sort();

    expect(notRegistered).toMatchInlineSnapshot(`
      Array [
        "describeCommand",
        "explainCommand",
        "externalCommand",
        "fillNullCommand",
        "lookupCommand",
        "tsCollapseCommand",
      ]
    `);
  });

  // Every position of a registered command has to get a meaning from the command signatures.
  // This is the list they have to cover. It changes only when the grammar changes.
  it('lists every position of the registered commands', () => {
    const table = Object.fromEntries(
      [...commandRules.filter(getRegisteredCommand).sort(), EXPRESSION_POSITIONS].map((command) => [
        command,
        describePositions(command),
      ])
    );

    expect(table).toMatchSnapshot();
  });
});
