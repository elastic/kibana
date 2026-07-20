/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux-v7';
import type { WorkflowDetailDto } from '@kbn/workflows';

import { WORKFLOW_UNSAVED_CHANGE_ID } from './constants';
import { UNSAVED_CHANGES_ACTION, UNSAVED_CHANGES_ACTOR } from './translations';
import { useWorkflowPendingChange } from './use_workflow_pending_change';
import { createMockStore } from '../../entities/workflows/store/__mocks__/store.mock';
import { setWorkflow, setYamlString } from '../../entities/workflows/store/workflow_detail/slice';

const baseWorkflow: WorkflowDetailDto = {
  id: 'workflow-1',
  name: 'My workflow',
  yaml: 'name: committed\n',
  enabled: true,
  createdAt: '2026-06-01T00:00:00.000Z',
  createdBy: 'user-1',
  lastUpdatedAt: '2026-06-16T00:00:00.000Z',
  lastUpdatedBy: 'user-1',
  definition: null,
  valid: true,
};

const renderPendingChangeHook = (store: ReturnType<typeof createMockStore>) => {
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(Provider, { store }, children);

  return renderHook(() => useWorkflowPendingChange(), { wrapper });
};

describe('useWorkflowPendingChange', () => {
  it('returns undefined when the editor yaml matches the committed workflow', () => {
    const store = createMockStore();
    store.dispatch(setWorkflow(baseWorkflow));
    store.dispatch(setYamlString(baseWorkflow.yaml));

    const { result } = renderPendingChangeHook(store);

    expect(result.current).toBeUndefined();
  });

  it('returns a pending change with changes when yaml is dirty', () => {
    const store = createMockStore();
    store.dispatch(setWorkflow(baseWorkflow));
    store.dispatch(setYamlString('name: edited\n'));

    const { result } = renderPendingChangeHook(store);

    expect(result.current).toMatchObject({
      id: WORKFLOW_UNSAVED_CHANGE_ID,
      actor: { name: UNSAVED_CHANGES_ACTOR },
      action: UNSAVED_CHANGES_ACTION,
    });
    expect(result.current?.changes?.count).toBeGreaterThan(0);
    expect(result.current?.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('preserves the unsaved timestamp across subsequent yaml edits', () => {
    const store = createMockStore();
    store.dispatch(setWorkflow(baseWorkflow));
    store.dispatch(setYamlString('name: edited\n'));

    const { result, rerender } = renderPendingChangeHook(store);
    const firstTimestamp = result.current?.timestamp;

    store.dispatch(setYamlString('name: edited again\n'));
    rerender();

    expect(result.current?.timestamp).toBe(firstTimestamp);
  });

  it('clears the pending change when yaml is synced back to committed state', () => {
    const store = createMockStore();
    store.dispatch(setWorkflow(baseWorkflow));
    store.dispatch(setYamlString('name: edited\n'));

    const { result, rerender } = renderPendingChangeHook(store);
    expect(result.current).toBeDefined();

    store.dispatch(setYamlString(baseWorkflow.yaml));
    rerender();

    expect(result.current).toBeUndefined();
  });
});
