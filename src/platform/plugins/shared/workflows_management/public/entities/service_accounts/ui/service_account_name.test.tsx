/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient } from '@kbn/react-query';
import { ServiceAccountName } from './service_account_name';
import { useKibana } from '../../../hooks/use_kibana';
import { createStartServicesMock, createUseKibanaMockValue } from '../../../mocks';
import { createQueryClientWrapper } from '../../../shared/test_utils/query_client_wrapper';

jest.mock('../../../hooks/use_kibana');

describe('ServiceAccountName', () => {
  const services = createStartServicesMock();
  let queryClient: QueryClient;
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient();
    jest.mocked(useKibana).mockReturnValue(createUseKibanaMockValue(services));
    services.security.serviceAccounts.isEnabled.mockReturnValue(true);
  });
  afterEach(() => queryClient.clear());

  const workload = { executionId: 'execution-1' };
  const renderName = (id = 'opaque-id') =>
    render(<ServiceAccountName id={id} workload={workload} />, {
      wrapper: createQueryClientWrapper(queryClient),
    });

  it('shows the name the execution reports and keeps the ID available to copy', async () => {
    services.http.get.mockResolvedValue({
      serviceAccount: {
        id: 'opaque-id',
        name: 'Investigation reader',
        enabled: true,
        assumable: true,
      },
    });
    renderName();
    expect(await screen.findByText('Investigation reader')).toBeInTheDocument();
    expect(screen.getByText('opaque-id')).toBeInTheDocument();
    expect(
      document.querySelector('[data-test-subj=workflowServiceAccountResolved]')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy service account ID' })).toBeInTheDocument();
    // The execution route is open to anyone who can read the execution. The service account
    // directory takes `manage_security`, so it is never asked.
    expect(services.http.get).toHaveBeenCalledTimes(1);
    expect(services.http.get).toHaveBeenCalledWith(
      '/internal/workflows/executions/execution-1/service_account',
      { version: '1' }
    );
  });

  it.each([
    { enabled: false, assumable: true },
    { enabled: true, assumable: false },
  ])('shows an unavailable account without a green check', async (flags) => {
    services.http.get.mockResolvedValue({
      serviceAccount: { id: 'opaque-id', name: 'Unavailable reader', ...flags },
    });
    renderName();
    expect(await screen.findByText('Unavailable reader')).toBeInTheDocument();
    expect(
      document.querySelector('[data-test-subj=workflowServiceAccountResolved]')
    ).not.toBeInTheDocument();
    expect(
      document.querySelector('[data-test-subj=workflowServiceAccountUnavailable]')
    ).toBeInTheDocument();
    expect(screen.getByText('opaque-id')).toBeInTheDocument();
  });

  it.each([403, 404, 503])('keeps the ID when lookup returns %s', async (status) => {
    services.http.get.mockRejectedValue({ response: { status } });
    renderName();
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
    expect(screen.getByText('opaque-id')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it.each([
    ['no account', null],
    ['another account', { id: 'other-id', name: 'Other', enabled: true, assumable: true }],
  ])('keeps only the ID when the execution reports %s', async (_label, serviceAccount) => {
    services.http.get.mockResolvedValue({ serviceAccount });
    renderName();
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
    expect(screen.getByText('opaque-id')).toBeInTheDocument();
    expect(screen.queryByText('Other')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('does not fetch without a workload to ask', () => {
    render(<ServiceAccountName id="opaque-id" />, {
      wrapper: createQueryClientWrapper(queryClient),
    });
    expect(screen.getByText('opaque-id')).toBeInTheDocument();
    expect(services.http.get).not.toHaveBeenCalled();
  });

  it('does not fetch when the feature is off', () => {
    services.security.serviceAccounts.isEnabled.mockReturnValue(false);
    renderName();
    expect(screen.getByText('opaque-id')).toBeInTheDocument();
    expect(services.http.get).not.toHaveBeenCalled();
  });
});
