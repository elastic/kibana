/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiProvider } from '@elastic/eui';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { WorkflowAccessControlModal } from './workflow_access_control_modal';
import { createMockStore } from '../../../entities/workflows/store/__mocks__/store.mock';
import {
  setWorkflow,
  setYamlString,
} from '../../../entities/workflows/store/workflow_detail/slice';
import { createMockWorkflowDetailDto } from '../../../shared/test_utils/mock_workflow_factories';
import { TestWrapper } from '../../../shared/test_utils/test_wrapper';

const mockHttp = { put: jest.fn(), get: jest.fn() };
const mockUserProfile = { getCurrent: jest.fn(), bulkGet: jest.fn(), suggest: jest.fn() };

jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => ({ services: { http: mockHttp, userProfile: mockUserProfile } }),
}));

describe('WorkflowAccessControlModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserProfile.getCurrent.mockResolvedValue({ uid: 'owner', user: { username: 'owner' } });
    mockUserProfile.bulkGet.mockResolvedValue([]);
    mockUserProfile.suggest.mockResolvedValue([]);
  });

  it.each(['owner', undefined])(
    'saves access without reloading the workflow or replacing draft YAML (owner_id=%s)',
    async (ownerId) => {
      const workflow = createMockWorkflowDetailDto({
        owner_id: ownerId,
        permissions: { read: true, edit: true, execute: true, manage: true },
      });
      const savedAccess = { access_mode: 'public' as const, entries: [] };
      const savedMetadata = {
        owner_id: 'owner',
        access_control: savedAccess,
        lastUpdatedAt: '2026-09-14T12:00:00.000Z',
        lastUpdatedBy: 'server-owner',
        version: 3,
      };
      mockHttp.put.mockResolvedValue(savedMetadata);
      const store = createMockStore();
      store.dispatch(setWorkflow(workflow));
      store.dispatch(setYamlString('name: unsaved changes'));
      const onClose = jest.fn();
      render(
        <TestWrapper store={store}>
          <EuiProvider>
            <WorkflowAccessControlModal workflow={workflow} onClose={onClose} />
          </EuiProvider>
        </TestWrapper>
      );
      const saveButton = screen.getByTestId('workflowAccessSave');
      await waitFor(() => expect(saveButton).toBeEnabled());

      await userEvent.click(saveButton);

      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
      expect(mockHttp.put).toHaveBeenCalledWith(
        `/internal/workflows/${workflow.id}/access_control`,
        { body: JSON.stringify(savedAccess) }
      );
      expect(mockHttp.get).not.toHaveBeenCalled();
      expect(store.getState().detail.workflow).toEqual({ ...workflow, ...savedMetadata });
      expect(store.getState().detail.yamlString).toBe('name: unsaved changes');
    }
  );
});
