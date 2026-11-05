/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';
import { getLocalStepDefinition } from './local_step_definitions';

describe('getLocalStepDefinition', () => {
  it('resolves every pure data step and rejects unknown types', () => {
    const logger = loggerMock.create();
    for (const stepType of [
      'data.map',
      'data.dedupe',
      'data.filter',
      'data.find',
      'data.regexExtract',
      'data.regexReplace',
      'data.aggregate',
      'data.concat',
      'data.parseJson',
      'data.stringifyJson',
    ]) {
      expect(getLocalStepDefinition(stepType, logger)?.id).toBe(stepType);
    }
    expect(getLocalStepDefinition('cases.createCase', logger)).toBeUndefined();
  });
});
