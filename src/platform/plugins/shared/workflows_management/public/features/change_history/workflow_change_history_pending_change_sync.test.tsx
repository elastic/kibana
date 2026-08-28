/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render } from '@testing-library/react';
import React, { useRef } from 'react';
import type { ChangeHistoryAdapter, ChangeHistoryPendingChange } from '@kbn/change-history-ui';
import { ChangeHistoryProvider } from '@kbn/change-history-ui';
import type { WorkflowDetailDto } from '@kbn/workflows';

import { WORKFLOW_UNSAVED_CHANGE_ID } from './constants';
import { WorkflowChangeHistoryPendingChangeSync } from './workflow_change_history_pending_change_sync';
import { createMockStore } from '../../entities/workflows/store/__mocks__/store.mock';
import { setWorkflow, setYamlString } from '../../entities/workflows/store/workflow_detail/slice';
import { TestWrapper } from '../../shared/test_utils';

const modalState = {
  isOpen: false,
};

jest.mock('@kbn/change-history-ui', () => {
  const actual = jest.requireActual('@kbn/change-history-ui');

  return {
    ...actual,
    useChangeHistoryModal: () => ({
      isOpen: modalState.isOpen,
      openModal: jest.fn(),
      closeModal: jest.fn(),
    }),
  };
});

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

const adapter: ChangeHistoryAdapter = {
  listChanges: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  getChange: jest.fn(),
  getPendingChange: jest.fn(),
};

const SyncHarness = ({
  pendingChangeRef,
}: {
  pendingChangeRef: React.MutableRefObject<ChangeHistoryPendingChange | undefined>;
}) => {
  const localRef = useRef<ChangeHistoryPendingChange | undefined>();
  const ref = pendingChangeRef ?? localRef;

  return <WorkflowChangeHistoryPendingChangeSync pendingChangeRef={ref} />;
};

const renderPendingChangeSync = ({
  store,
  pendingChangeRef,
  isModalOpen,
}: {
  store: ReturnType<typeof createMockStore>;
  pendingChangeRef: React.MutableRefObject<ChangeHistoryPendingChange | undefined>;
  isModalOpen: boolean;
}) => {
  modalState.isOpen = isModalOpen;

  return render(
    <TestWrapper store={store}>
      <ChangeHistoryProvider
        objectId="workflow-1"
        adapter={adapter}
        labels={{ previewTitle: 'My workflow' }}
        renderPreview={() => null}
        scope={{
          module: 'stack',
          dataset: 'workflows',
          objectType: 'workflow',
        }}
        features={{ unsavedChanges: true }}
      >
        <SyncHarness pendingChangeRef={pendingChangeRef} />
      </ChangeHistoryProvider>
    </TestWrapper>
  );
};

describe('WorkflowChangeHistoryPendingChangeSync', () => {
  beforeEach(() => {
    modalState.isOpen = false;
    jest.clearAllMocks();
  });

  it('clears the pending change ref while the history modal is closed', () => {
    const store = createMockStore();
    store.dispatch(setWorkflow(baseWorkflow));
    store.dispatch(setYamlString('name: edited\n'));

    const pendingChangeRef: React.MutableRefObject<ChangeHistoryPendingChange | undefined> = {
      current: {
        id: WORKFLOW_UNSAVED_CHANGE_ID,
        timestamp: '2026-07-03T12:00:00.000Z',
        actor: { name: 'You' },
        action: 'Unsaved changes',
        snapshot: { workflow: { yaml: 'name: edited\n' } },
      },
    };

    renderPendingChangeSync({ store, pendingChangeRef, isModalOpen: false });

    expect(pendingChangeRef.current).toBeUndefined();
  });

  it('populates the pending change ref when the history modal is open and yaml is dirty', () => {
    const store = createMockStore();
    store.dispatch(setWorkflow(baseWorkflow));
    store.dispatch(setYamlString('name: edited\n'));

    const pendingChangeRef: React.MutableRefObject<ChangeHistoryPendingChange | undefined> = {
      current: undefined,
    };

    renderPendingChangeSync({ store, pendingChangeRef, isModalOpen: true });

    expect(pendingChangeRef.current).toMatchObject({
      id: WORKFLOW_UNSAVED_CHANGE_ID,
    });
    expect(pendingChangeRef.current?.changes?.count).toBeGreaterThan(0);
    expect(pendingChangeRef.current?.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('clears the pending change ref when the modal closes after being open', () => {
    const store = createMockStore();
    store.dispatch(setWorkflow(baseWorkflow));
    store.dispatch(setYamlString('name: edited\n'));

    const pendingChangeRef: React.MutableRefObject<ChangeHistoryPendingChange | undefined> = {
      current: undefined,
    };

    const { rerender } = renderPendingChangeSync({
      store,
      pendingChangeRef,
      isModalOpen: true,
    });

    expect(pendingChangeRef.current).toBeDefined();

    modalState.isOpen = false;
    rerender(
      <TestWrapper store={store}>
        <ChangeHistoryProvider
          objectId="workflow-1"
          adapter={adapter}
          labels={{ previewTitle: 'My workflow' }}
          renderPreview={() => null}
          scope={{
            module: 'stack',
            dataset: 'workflows',
            objectType: 'workflow',
          }}
          features={{ unsavedChanges: true }}
        >
          <SyncHarness pendingChangeRef={pendingChangeRef} />
        </ChangeHistoryProvider>
      </TestWrapper>
    );

    expect(pendingChangeRef.current).toBeUndefined();
  });
});
