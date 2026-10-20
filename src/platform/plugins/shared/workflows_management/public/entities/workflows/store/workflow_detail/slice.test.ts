/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowDetailDto } from '@kbn/workflows';
import {
  selectTestModalStayInEditor,
  selectTestStepModalOpenStepId,
  selectTestStepModalStayInEditor,
  selectTreeRuns,
} from './selectors';
import {
  addTreeRun,
  openTestModalInEditor,
  openTestStepModalInEditor,
  setIsTestModalOpen,
  setTestStepModalOpenStepId,
  setWorkflow,
} from './slice';
import { createMockStore } from '../__mocks__/store.mock';

const workflowWithId = (id: string) => ({ id, yaml: 'name: x\nsteps: []\n' } as WorkflowDetailDto);

describe('reference tree runs', () => {
  it('records runs newest last and dedupes by execution id', () => {
    const store = createMockStore();
    store.dispatch(addTreeRun({ executionId: 'a', stepId: 'step_1' }));
    store.dispatch(addTreeRun({ executionId: 'b' }));
    store.dispatch(addTreeRun({ executionId: 'a', stepId: 'step_1' }));

    expect(selectTreeRuns(store.getState())).toEqual([
      { executionId: 'b' },
      { executionId: 'a', stepId: 'step_1' },
    ]);
  });

  it('keeps only the 10 newest runs', () => {
    const store = createMockStore();
    for (let index = 0; index < 12; index++) {
      store.dispatch(addTreeRun({ executionId: `run-${index}` }));
    }

    const runs = selectTreeRuns(store.getState());
    expect(runs).toHaveLength(10);
    expect(runs[0].executionId).toBe('run-2');
    expect(runs[9].executionId).toBe('run-11');
  });

  it('forgets the runs when a different workflow is loaded, not when the same one reloads', () => {
    const store = createMockStore();
    store.dispatch(setWorkflow(workflowWithId('wf-1')));
    store.dispatch(addTreeRun({ executionId: 'a' }));

    store.dispatch(setWorkflow(workflowWithId('wf-1')));
    expect(selectTreeRuns(store.getState())).toHaveLength(1);

    store.dispatch(setWorkflow(workflowWithId('wf-2')));
    expect(selectTreeRuns(store.getState())).toEqual([]);
  });
});

describe('stay-in-editor modal flags', () => {
  it('opens the Test step modal in-editor and resets the flag when it is opened or closed normally', () => {
    const store = createMockStore();

    store.dispatch(openTestStepModalInEditor('step_1'));
    expect(selectTestStepModalOpenStepId(store.getState())).toBe('step_1');
    expect(selectTestStepModalStayInEditor(store.getState())).toBe(true);

    store.dispatch(setTestStepModalOpenStepId(undefined));
    expect(selectTestStepModalStayInEditor(store.getState())).toBe(false);

    store.dispatch(openTestStepModalInEditor('step_1'));
    store.dispatch(setTestStepModalOpenStepId('step_2'));
    expect(selectTestStepModalStayInEditor(store.getState())).toBe(false);
  });

  it('opens the Test workflow modal in-editor and resets the flag when it is opened or closed normally', () => {
    const store = createMockStore();

    store.dispatch(openTestModalInEditor());
    expect(store.getState().detail.isTestModalOpen).toBe(true);
    expect(selectTestModalStayInEditor(store.getState())).toBe(true);

    store.dispatch(setIsTestModalOpen(false));
    expect(selectTestModalStayInEditor(store.getState())).toBe(false);

    store.dispatch(openTestModalInEditor());
    store.dispatch(setIsTestModalOpen(true));
    expect(selectTestModalStayInEditor(store.getState())).toBe(false);
  });
});
