/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { StepCategory } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import { createPollServerStepDefinition } from './types';

describe('createPollServerStepDefinition', () => {
  const baseDefinition = {
    id: 'test.pollStep',
    category: StepCategory.Kibana,
    label: 'Poll step',
    description: 'Test poll step',
    inputSchema: z.object({}),
    outputSchema: z.object({}),
    poll: async () => ({ output: {} }),
  };

  it('defaults supportedExecutionModes to async when omitted', () => {
    const definition = createPollServerStepDefinition({ ...baseDefinition });

    expect(definition.supportedExecutionModes).toEqual(['async']);
  });

  it('does not overwrite an explicitly supplied supportedExecutionModes', () => {
    const definition = createPollServerStepDefinition({
      ...baseDefinition,
      supportedExecutionModes: ['sync', 'async'],
    });

    expect(definition.supportedExecutionModes).toEqual(['sync', 'async']);
  });
});
