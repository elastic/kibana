/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Scenario, ScenarioTable, ScenarioWorld } from '../../../__tests__/scenarios';
import { settings } from '../../definitions/generated/settings';

const rows = (
  group: string,
  name: string,
  queries: string[],
  exact: string[],
  world?: Partial<ScenarioWorld>
): Scenario[] => queries.map((query) => ({ group, name, query, world, expect: { exact } }));

const beforeSemicolon = (
  group: string,
  name: string,
  queries: Array<[query: string, after: string]>,
  exact: string[]
): Scenario[] =>
  queries.map(([query, after]) => ({ group, name, query, after, expect: { exact } }));

const NAMES_SERVERLESS = 'Setting name suggestions -- Serverless';
const NAMES_STATEFUL = 'Setting name suggestions -- Stateful';
const VALUES = 'Setting value suggestions';
const PROJECT_ROUTING = 'Setting value suggestions: project routing';
const UNMAPPED_FIELDS = 'Setting value suggestions: unmapped fields';
const APPROXIMATION = 'Setting value suggestions: approximation';
const AFTER_ASSIGNMENT = 'After setting assignment';

const serverless: Partial<ScenarioWorld> = { isServerless: true };

const suggestedSettings = settings.filter(({ ignoreAsSuggestion }) => !ignoreAsSuggestion);
const serverlessSettings = suggestedSettings.map(({ name }) => `${name} = `);
const statefulSettings = suggestedSettings
  .filter(({ serverlessOnly }) => !serverlessOnly)
  .map(({ name }) => `${name} = `);

export const setScenarios: ScenarioTable = {
  command: 'set',
  scenarios: [
    ...rows(
      NAMES_SERVERLESS,
      'suggests available settings after SET, with any whitespace or a partial name',
      ['SET ', 'SET   ', 'SET\t', 'SET project'],
      serverlessSettings,
      serverless
    ),
    ...rows(
      NAMES_SERVERLESS,
      'suggests assignment operator after setting name',
      ['SET project_routing '],
      ['= '],
      serverless
    ),
    ...rows(NAMES_STATEFUL, 'suggests stateful settings after SET', ['SET '], statefulSettings),

    ...rows(VALUES, 'suggests nothing if setting name is unknown', ['SET unknown_setting = '], []),
    ...rows(
      PROJECT_ROUTING,
      'suggests common project routing values after assignment operator',
      ['SET project_routing = '],
      ['"_alias:*";', '"_alias:_origin";']
    ),
    ...rows(
      PROJECT_ROUTING,
      'suggests common project routing values for partial input',
      ['SET project_routing = "_alias:'],
      ['_alias:*', '_alias:_origin']
    ),
    ...beforeSemicolon(
      PROJECT_ROUTING,
      'suggests the value without semicolon if already present in the query',
      [
        ['SET project_routing = ', ';'],
        ['SET project_routing = ', ' ;'],
      ],
      ['"_alias:*"', '"_alias:_origin"']
    ),
    ...rows(
      UNMAPPED_FIELDS,
      'suggests unmapped fields values after assignment operator',
      ['SET unmapped_fields = '],
      ['"DEFAULT";', '"LOAD";', '"LOAD_ALL";', '"NULLIFY";']
    ),
    ...rows(
      UNMAPPED_FIELDS,
      'suggests unmapped fields values for partial input',
      ['SET unmapped_fields = "N'],
      ['DEFAULT', 'LOAD', 'NULLIFY', 'LOAD_ALL']
    ),
    ...rows(
      APPROXIMATION,
      'suggests booleans and a map after assignment operator',
      ['SET approximation = '],
      ['false;', 'true;', '{ $0 };']
    ),
    ...rows(
      APPROXIMATION,
      'suggests map parameter names after selecting the map option',
      ['SET approximation = { '],
      ['"confidence_level": ', '"rows": ']
    ),
    ...rows(
      APPROXIMATION,
      'suggests map parameter name after completing a parameter entry',
      ['SET approximation = { "rows": 100, '],
      ['"confidence_level": ']
    ),
    ...rows(
      APPROXIMATION,
      'suggests map parameter values after parameter name and colon: rows',
      ['SET approximation = { "rows": '],
      ['100000', '1000000', '500000']
    ),
    ...rows(
      APPROXIMATION,
      'suggests map parameter values after parameter name and colon: confidence_level',
      ['SET approximation = { "confidence_level": '],
      ['0.99', '0.95', '0.9']
    ),

    ...rows(
      AFTER_ASSIGNMENT,
      'suggests semicolon with newline after a complete value',
      [
        'SET project_routing = "some_value"',
        'SET project_routing = "test"',
        'SET project_routing = true',
        'SET project_routing = 123',
      ],
      [';\n']
    ),
    ...beforeSemicolon(
      AFTER_ASSIGNMENT,
      'does not suggest semicolon if already present in the query',
      [
        ['SET project_routing = 123', ';'],
        ['SET project_routing = 123', ' ;'],
        ['SET project_routing = 123 ', ' ;'],
      ],
      []
    ),
  ],
};
