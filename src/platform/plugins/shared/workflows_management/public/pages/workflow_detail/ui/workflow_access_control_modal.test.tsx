/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiProvider } from '@elastic/eui';
import { act, render, screen, waitFor } from '@testing-library/react';
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

// Failing: See https://github.com/elastic/kibana/issues/295436
describe.skip('WorkflowAccessControlModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserProfile.getCurrent.mockResolvedValue({ uid: 'owner', user: { username: 'owner' } });
    mockUserProfile.bulkGet.mockResolvedValue([]);
    mockUserProfile.suggest.mockResolvedValue([]);
  });

  it('warns before claiming an ownerless workflow as private', async () => {
    const workflow = createMockWorkflowDetailDto({
      owner_id: undefined,
      access_control: { access_mode: 'public', entries: [] },
      permissions: { read: true, edit: true, execute: true, manage: true },
    });
    render(
      <TestWrapper>
        <EuiProvider>
          <WorkflowAccessControlModal workflow={workflow} onClose={jest.fn()} />
        </EuiProvider>
      </TestWrapper>
    );
    const notice = 'You will become the owner when you make this workflow private.';
    expect(screen.queryByText(notice)).not.toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Visibility'));
    await userEvent.click(screen.getByRole('option', { name: /^Private/ }));
    expect(await screen.findByText(notice)).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Visibility'));
    await userEvent.click(screen.getByRole('option', { name: /^Public/ }));
    expect(screen.queryByText(notice)).not.toBeInTheDocument();
  });

  it('shows the admin notice and updates execution permission after a self-grant', async () => {
    mockUserProfile.getCurrent.mockResolvedValue({ uid: 'admin', user: { username: 'admin' } });
    mockUserProfile.suggest.mockResolvedValue([
      { uid: 'admin', enabled: true, user: { username: 'admin' }, data: {} },
    ]);
    const workflow = createMockWorkflowDetailDto({
      owner_id: 'owner',
      access_control: { access_mode: 'private', entries: [] },
      permissions: { read: true, edit: false, execute: false, manage: true },
    });
    const savedAccess = {
      owner_id: 'owner',
      access_control: {
        access_mode: 'private',
        entries: [{ type: 'user', id: 'admin', role: 'executor' }],
      },
      permissions: { read: true, edit: false, execute: true, manage: true },
    };
    mockHttp.put.mockResolvedValue(savedAccess);
    const store = createMockStore();
    store.dispatch(setWorkflow(workflow));
    render(
      <TestWrapper store={store}>
        <EuiProvider>
          <WorkflowAccessControlModal workflow={workflow} onClose={jest.fn()} />
        </EuiProvider>
      </TestWrapper>
    );
    expect(
      await screen.findByText("You are editing another user's access settings")
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('combobox', { name: 'Find users' }));
    await userEvent.click(await screen.findByRole('option', { name: /admin/ }));
    await userEvent.click(screen.getByTestId('entityAccessControlRole-admin'));
    await userEvent.click(screen.getByRole('option', { name: 'Executor' }));
    await userEvent.click(screen.getByTestId('workflowAccessSave'));
    await waitFor(() => expect(store.getState().detail.workflow?.permissions?.execute).toBe(true));
    expect(mockHttp.put).toHaveBeenCalledWith(`/internal/workflows/${workflow.id}/access_control`, {
      body: JSON.stringify(savedAccess.access_control),
    });
    expect(store.getState().detail.workflow?.owner_id).toBe('owner');
  });

  it('lets an administrator without a profile find and add a user', async () => {
    mockUserProfile.getCurrent.mockResolvedValue(null);
    mockUserProfile.suggest.mockResolvedValue([
      { uid: 'recipient', enabled: true, user: { username: 'recipient' }, data: {} },
    ]);
    const workflow = createMockWorkflowDetailDto({
      owner_id: 'owner',
      access_control: { access_mode: 'private', entries: [] },
      permissions: { read: true, edit: false, execute: false, manage: true },
    });
    mockHttp.put.mockResolvedValue(workflow);
    render(
      <TestWrapper>
        <EuiProvider>
          <WorkflowAccessControlModal workflow={workflow} onClose={jest.fn()} />
        </EuiProvider>
      </TestWrapper>
    );
    expect(
      await screen.findByText("You are editing another user's access settings")
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('combobox', { name: 'Find users' }));
    await userEvent.click(await screen.findByRole('option', { name: /recipient/ }));
    await userEvent.click(screen.getByTestId('workflowAccessSave'));
    await waitFor(() =>
      expect(mockHttp.put).toHaveBeenCalledWith(
        `/internal/workflows/${workflow.id}/access_control`,
        {
          body: JSON.stringify({
            access_mode: 'private',
            entries: [{ type: 'user', id: 'recipient', role: 'viewer' }],
          }),
        }
      )
    );
  });

  it.each(['owner', undefined])(
    'waits for the current profile before showing the notice (%s)',
    async (uid) => {
      let resolveProfile: (
        profile: { uid: string; user: { username: string } } | null
      ) => void = () => {};
      mockUserProfile.getCurrent.mockReturnValue(
        new Promise((resolve) => {
          resolveProfile = resolve;
        })
      );
      const workflow = createMockWorkflowDetailDto({
        owner_id: 'owner',
        permissions: { read: true, edit: false, execute: false, manage: true },
      });
      render(
        <TestWrapper>
          <EuiProvider>
            <WorkflowAccessControlModal workflow={workflow} onClose={jest.fn()} />
          </EuiProvider>
        </TestWrapper>
      );
      expect(
        screen.queryByText("You are editing another user's access settings")
      ).not.toBeInTheDocument();
      await act(async () => {
        resolveProfile(uid ? { uid, user: { username: uid } } : null);
      });
      if (uid) {
        await waitFor(() => expect(mockUserProfile.getCurrent).toHaveBeenCalled());
        expect(
          screen.queryByText("You are editing another user's access settings")
        ).not.toBeInTheDocument();
      } else {
        expect(
          await screen.findByText("You are editing another user's access settings")
        ).toBeInTheDocument();
      }
    }
  );

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
