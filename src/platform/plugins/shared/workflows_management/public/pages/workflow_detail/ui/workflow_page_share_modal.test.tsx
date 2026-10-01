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

const renderModal = () =>
  render(
    <TestWrapper store={createMockStore()}>
      <EuiProvider>
        <WorkflowPageShareModal workflowId="wf 1" onClose={jest.fn()} />
      </EuiProvider>
    </TestWrapper>
  );

const urlField = () => screen.findByTestId('workflowPageShareUrl') as Promise<HTMLInputElement>;

describe('WorkflowPageShareModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHttp.get.mockResolvedValue({ enabled: true, path: '/api/workflows/pages/wf/old' });
  });

  it('shows the absolute page URL on the public origin', async () => {
    renderModal();

    expect((await urlField()).value).toBe('https://kibana.example.com/api/workflows/pages/wf/old');
    expect(mockHttp.get).toHaveBeenCalledWith('/internal/workflows/pages/wf%201/link', {
      version: '1',
    });
  });

  it('warns that the page is offline while the workflow is disabled', async () => {
    mockHttp.get.mockResolvedValue({ enabled: false, path: '/api/workflows/pages/wf/old' });
    renderModal();

    expect(await screen.findByText('The page is offline')).toBeInTheDocument();
  });

  it('asks before rotating, then shows the new URL', async () => {
    mockHttp.post.mockResolvedValue({ enabled: true, path: '/api/workflows/pages/wf/new' });
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
