/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { columns } from '../../../__tests__/scenarios';
import type { Scenario, ScenarioTable } from '../../../__tests__/scenarios';

const rows = (name: string, queries: string[], exact: string[]): Scenario[] =>
  queries.map((query) => ({ name, query, expect: { exact } }));

const stringColumns = columns({ types: ['keyword', 'text'], followedBySpace: true });

export const grokScenarios: ScenarioTable = {
  command: 'grok',
  scenarios: [
    ...rows('suggests fields after GROK', ['from a | grok ', 'from a | grok key'], stringColumns),
    ...rows(
      'suggests a pattern after a field name',
      ['from a | grok keywordField '],
      ['"%{WORD:firstWord}" ']
    ),
    {
      name: 'suggests pipe or comma after multiple patterns',
      query: 'from a | grok keywordField "%{IP:ip}", "%{WORD:method}" ',
      expect: { contains: ['| ', ', '] },
    },
  ],
};
