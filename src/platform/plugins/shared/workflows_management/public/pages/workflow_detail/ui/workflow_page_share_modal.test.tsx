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
import { WorkflowPageShareModal } from './workflow_page_share_modal';
import { createMockStore } from '../../../entities/workflows/store/__mocks__/store.mock';
import { TestWrapper } from '../../../shared/test_utils/test_wrapper';

const mockHttp = {
  get: jest.fn(),
  post: jest.fn(),
  basePath: { publicBaseUrl: 'https://kibana.example.com' },
};

jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => ({ services: { http: mockHttp } }),
}));

const renderModal = ({ canManage = true }: { canManage?: boolean } = {}) =>
  render(
    <TestWrapper store={createMockStore()}>
      <EuiProvider>
        <WorkflowPageShareModal workflowId="wf 1" canManage={canManage} onClose={jest.fn()} />
      </EuiProvider>
    </TestWrapper>
  );

const link = (overrides: Record<string, unknown> = {}) => ({
  enabled: true,
  workflowEnabled: true,
  online: true,
  serviceAccountId: 'kibana/pages',
  path: '/api/workflows/pages/wf/old',
  ...overrides,
});

const urlField = () => screen.findByTestId('workflowPageShareUrl') as Promise<HTMLInputElement>;

describe('WorkflowPageShareModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHttp.get.mockResolvedValue(link());
  });

  it('shows the absolute page URL on the public origin', async () => {
    renderModal();

    expect((await urlField()).value).toBe('https://kibana.example.com/api/workflows/pages/wf/old');
    expect(mockHttp.get).toHaveBeenCalledWith('/internal/workflows/pages/wf%201/link', {
      version: '1',
    });
  });

  it('warns that the page is offline while the workflow is disabled', async () => {
    mockHttp.get.mockResolvedValue(link({ workflowEnabled: false, online: false }));
    renderModal();

    expect(await screen.findByText('The page is offline')).toBeInTheDocument();
  });

  it('warns that the page is off while its switch is off', async () => {
    mockHttp.get.mockResolvedValue(link({ enabled: false, online: false }));
    renderModal();

    expect(await screen.findByText('The page is off')).toBeInTheDocument();
    expect(screen.queryByText('The page is offline')).not.toBeInTheDocument();
  });

  it('turns the page off with the switch', async () => {
    mockHttp.post.mockResolvedValue(link({ enabled: false, online: false }));
    renderModal();
    await urlField();

    await userEvent.click(screen.getByTestId('workflowPageShareEnabled'));

    expect(mockHttp.post).toHaveBeenCalledWith('/internal/workflows/pages/wf%201/_enabled', {
      version: '1',
      body: JSON.stringify({ enabled: false }),
    });
    expect(await screen.findByText('The page is off')).toBeInTheDocument();
  });

  it('shows the URL but no rotation or switch to a user without update rights', async () => {
    renderModal({ canManage: false });

    expect((await urlField()).value).toBe('https://kibana.example.com/api/workflows/pages/wf/old');
    expect(screen.queryByTestId('workflowPageShareRotate')).not.toBeInTheDocument();
    expect(screen.getByTestId('workflowPageShareEnabled')).toBeDisabled();
  });

  it('asks before rotating, then shows the new URL', async () => {
    mockHttp.post.mockResolvedValue(link({ path: '/api/workflows/pages/wf/new' }));
    renderModal();
    await urlField();

    await userEvent.click(screen.getByTestId('workflowPageShareRotate'));
    expect(mockHttp.post).not.toHaveBeenCalled();
    await userEvent.click(screen.getByTestId('workflowPageShareRotateConfirm'));

    await waitFor(async () =>
      expect((await urlField()).value).toBe('https://kibana.example.com/api/workflows/pages/wf/new')
    );
    expect(mockHttp.post).toHaveBeenCalledWith('/internal/workflows/pages/wf%201/_rotate', {
      version: '1',
    });
  });
});
