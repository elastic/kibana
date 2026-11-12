/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { functions } from '../../../__tests__/scenarios';
import type { ScenarioTable } from '../../../__tests__/scenarios';

const WITH_MAP = 'WITH { $0 }';
const stringFunctions = functions({
  availableIn: 'eval',
  returning: ['keyword', 'text'],
  scalar: true,
});

export const userAgentScenarios: ScenarioTable = {
  command: 'user_agent',
  scenarios: [
    {
      name: 'suggests a new user-defined column name after the USER_AGENT keyword',
      query: 'FROM a | USER_AGENT ',
      expect: { exact: ['${1:user_agent} = '] },
    },
    {
      name: 'suggests = after the target field name',
      query: 'FROM a | USER_AGENT ua ',
      expect: { exact: ['= '] },
    },
    {
      name: 'suggests string fields and string functions after the assignment operator',
      query: 'FROM a | USER_AGENT ua = ',
      expect: { contains: ['keywordField ', ...stringFunctions] },
    },
    {
      // Columns and functions carry a comma because CONCAT needs more arguments.
      name: 'suggests string fields and string functions when expression is an incomplete function call',
      query: 'FROM a | USER_AGENT ua = CONCAT(',
      expect: {
        contains: [
          'keywordField, ',
          ...stringFunctions
            .filter((text) => !text.startsWith('CONCAT('))
            .map((text) => `${text},`),
        ],
        excludes: [WITH_MAP, '| '],
      },
    },
    {
      name: 'suggests WITH and pipe after a complete expression',
      query: 'FROM a | USER_AGENT ua = keywordField ',
      expect: { exact: ['\n', WITH_MAP, '| '] },
    },
    {
      name: 'suggests a map placeholder after the WITH keyword',
      query: 'FROM a | USER_AGENT ua = keywordField WITH ',
      expect: { exact: ['{ $0 }'] },
    },
    {
      name: 'suggests map keys inside an empty options map',
      query: 'FROM a | USER_AGENT ua = keywordField WITH { ',
      expect: {
        contains: ['"regex_file": "$0"', '"extract_device_type": ', '"properties": [ $0 ]'],
      },
    },
    {
      name: 'suggests remaining map keys after one entry',
      query: 'FROM a | USER_AGENT ua = keywordField WITH { "regex_file": "_default_", ',
      expect: {
        contains: ['"extract_device_type": ', '"properties": [ $0 ]'],
        excludes: ['"regex_file": "$0"'],
      },
    },
    {
      name: 'suggests all property values inside an empty properties array',
      query: 'FROM a | USER_AGENT ua = keywordField WITH { "properties": [ ',
      expect: { exact: ['"name"', '"version"', '"os"', '"device"'] },
    },
    {
      name: 'suggests remaining property values after one is already selected',
      query: 'FROM a | USER_AGENT ua = keywordField WITH { "properties": ["name", ',
      expect: { exact: ['"version"', '"os"', '"device"'] },
    },
    {
      name: 'suggests no property values when all are already selected',
      query:
        'FROM a | USER_AGENT ua = keywordField WITH { "properties": ["name", "version", "os", "device", ',
      expect: { exact: [] },
    },
    {
      name: 'suggests pipe after a complete options map',
      query: 'FROM a | USER_AGENT ua = keywordField WITH { "extract_device_type": true } ',
      expect: { exact: ['\n', '| '] },
    },
  ],
};
