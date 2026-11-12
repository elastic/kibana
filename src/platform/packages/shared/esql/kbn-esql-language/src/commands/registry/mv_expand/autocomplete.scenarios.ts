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

const expandableColumns = columns({ followedBySpace: true });

export const mvExpandScenarios: ScenarioTable = {
  command: 'mv_expand',
  scenarios: [
    {
      name: 'suggests columns',
      query: 'from a | mv_expand ',
      expect: { exact: expandableColumns },
    },
    {
      name: 'works with a field name prefix',
      query: 'from a | mv_expand key',
      expect: { exact: expandableColumns },
    },
    {
      name: 'works with a complete field name',
      query: 'from a | mv_expand keywordField',
      expect: { exact: expandableColumns },
    },
    {
      name: 'suggests pipe after column',
      query: 'from a | mv_expand doubleField ',
      expect: { exact: ['\n', '| '] },
    },
  ],
};
