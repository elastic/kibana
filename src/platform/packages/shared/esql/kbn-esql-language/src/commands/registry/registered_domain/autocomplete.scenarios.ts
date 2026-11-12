/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { columns } from '../../../__tests__/scenarios';
import type { ScenarioTable } from '../../../__tests__/scenarios';

export const registeredDomainScenarios: ScenarioTable = {
  command: 'registered_domain',
  scenarios: [
    {
      name: 'suggests target field after command keyword',
      query: 'FROM index | REGISTERED_DOMAIN ',
      expect: { exact: ['col0 = '] },
    },
    {
      name: 'suggests assignment operator after target field',
      query: 'FROM index | REGISTERED_DOMAIN prefix ',
      expect: { exact: ['= '] },
    },
    {
      name: 'suggests string fields after assignment operator',
      query: 'FROM index | REGISTERED_DOMAIN prefix = ',
      expect: { exact: columns({ types: ['keyword', 'text'], followedBySpace: true }) },
    },
    {
      name: 'suggests pipe after complete command',
      query: 'FROM index | REGISTERED_DOMAIN prefix = host ',
      expect: { exact: ['\n', '| '] },
    },
  ],
};
