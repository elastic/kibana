/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Scenario, ScenarioTable } from '../../../__tests__/scenarios';

const afterInfo: Scenario[] = ['SHOW INFO ', 'SHOW INFO\t ', 'SHOW info '].map((query) => ({
  name: 'suggests pipe after INFO',
  query,
  expect: { exact: ['| ', '\n'] },
}));

const afterRandomWord: Scenario[] = ['SHOW lolz ', 'SHOW inof '].map((query) => ({
  name: 'suggests nothing after a random word',
  query,
  expect: { exact: [] },
}));

export const showScenarios: ScenarioTable = {
  command: 'show',
  scenarios: [
    {
      name: 'suggests INFO',
      query: 'SHOW ',
      expect: { exact: ['INFO'] },
    },
    ...afterInfo,
    ...afterRandomWord,
  ],
};
