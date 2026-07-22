/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

<<<<<<< HEAD
import { getBuiltInStepDefinition } from '@kbn/workflows';
=======
>>>>>>> b2c2244a48b2 ([Workflows] Add synchronous execution mode)
import { validateSyncWorkflow } from './validate_sync_workflow';

const createGraph = (stepType: string) => ({
  topologicalOrder: ['node-1'],
  getNode: jest.fn().mockReturnValue({
    id: 'node-1',
    stepId: 'step-1',
    stepType,
  }),
});

describe('validateSyncWorkflow', () => {
  it.each(['wait', 'waitForInput', 'waitForApproval', 'workflow.execute', 'workflow.executeAsync'])(
    'rejects async-only step %s',
    (stepType) => {
<<<<<<< HEAD
      expect(() => validateSyncWorkflow(createGraph(stepType), () => undefined)).toThrow(
=======
      expect(() => validateSyncWorkflow(createGraph(stepType))).toThrow(
>>>>>>> b2c2244a48b2 ([Workflows] Add synchronous execution mode)
        'is not supported in synchronous workflows'
      );
    }
  );

  it('accepts ordinary and capability-backed atomic steps', () => {
<<<<<<< HEAD
    expect(() => validateSyncWorkflow(createGraph('ai.pii'), () => undefined)).not.toThrow();
  });

  it('derives extension execution constraints from the registered definition', () => {
    expect(() =>
      validateSyncWorkflow(createGraph('custom.async'), (stepType) =>
        stepType === 'custom.async' ? getBuiltInStepDefinition('wait') : undefined
      )
    ).toThrow('is not supported in synchronous workflows');
=======
    expect(() => validateSyncWorkflow(createGraph('ai.pii'))).not.toThrow();
>>>>>>> b2c2244a48b2 ([Workflows] Add synchronous execution mode)
  });
});
