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

  it('shows the resolved name and keeps the ID available to copy', async () => {
    services.http.get.mockResolvedValue({
      id: 'opaque-id',
      name: 'Investigation reader',
      enabled: true,
      assumable: true,
    });
    render(<ServiceAccountName id="opaque-id" />, {
      wrapper: createQueryClientWrapper(queryClient),
    });
    expect(await screen.findByText('Investigation reader')).toBeInTheDocument();
    expect(screen.getByText('opaque-id')).toBeInTheDocument();
    expect(
      document.querySelector('[data-test-subj=workflowServiceAccountResolved]')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy service account ID' })).toBeInTheDocument();
  });

  it.each([
    { enabled: false, assumable: true },
    { enabled: true, assumable: false },
  ])('shows an unavailable account without a green check', async (flags) => {
    services.http.get.mockResolvedValue({ id: 'opaque-id', name: 'Unavailable reader', ...flags });
    render(<ServiceAccountName id="opaque-id" />, {
      wrapper: createQueryClientWrapper(queryClient),
    });
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
    render(<ServiceAccountName id="opaque-id" />, {
      wrapper: createQueryClientWrapper(queryClient),
    });
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
    expect(screen.getByText('opaque-id')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('does not fetch when the feature is off', () => {
    services.security.serviceAccounts.isEnabled.mockReturnValue(false);
    render(<ServiceAccountName id="opaque-id" />, {
      wrapper: createQueryClientWrapper(queryClient),
    });
    expect(screen.getByText('opaque-id')).toBeInTheDocument();
    expect(services.http.get).not.toHaveBeenCalled();
  });

  it('resolves the supplied execution identity independently of another account', async () => {
    services.http.get
      .mockResolvedValueOnce({ id: 'a', name: 'Account A' })
      .mockResolvedValueOnce({ id: 'b', name: 'Account B' });
    const { rerender } = render(<ServiceAccountName id="a" />, {
      wrapper: createQueryClientWrapper(queryClient),
    });
    expect(await screen.findByText('Account A')).toBeInTheDocument();
    rerender(<ServiceAccountName id="b" />);
    expect(screen.queryByText('Account A')).not.toBeInTheDocument();
    expect(await screen.findByText('Account B')).toBeInTheDocument();
  });
});
