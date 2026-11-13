/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolveRole, UNDESCRIBED_COMMANDS } from '../../esql_js_sim/definitions';
import { getCommandStarts, getGrammarPositions } from '../../esql_js_sim/grammar';
import { getRegisteredCommand } from './command_metadata';

const registeredRules = Object.keys(getCommandStarts()).filter(getRegisteredCommand);

describe('the signatures of the registered commands', () => {
  // The gate for a grammar upgrade and for a new command: a command Kibana registers has to be
  // described, and every place it has needs a role from its signature.
  it('describe every command Kibana has registered', () => {
    expect(registeredRules.filter((rule) => rule in UNDESCRIBED_COMMANDS)).toEqual([]);
  });

  it('give every position of a registered command a role', () => {
    const unclassified = getGrammarPositions()
      .filter(({ command }) => registeredRules.includes(command))
      .filter(({ path, takes }) => resolveRole(path, takes)?.source !== 'signature')
      .map(({ command, path }) => `${command}: ${path.join(' / ')}`);

    expect(unclassified).toEqual([]);
  });
});
