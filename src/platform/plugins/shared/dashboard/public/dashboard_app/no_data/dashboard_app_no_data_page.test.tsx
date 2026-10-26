/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { embeddableService, lensService } from '../../services/kibana_services';
import { DashboardAppNoDataPage } from './dashboard_app_no_data';

jest.mock('@kbn/shared-ux-page-analytics-no-data', () => ({
  AnalyticsNoDataPageKibanaProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  AnalyticsNoDataPage: ({
    onTryESQL,
    isTryESQLDisabled,
  }: {
    onTryESQL: () => void;
    isTryESQLDisabled?: boolean;
  }) => (
    <button disabled={isTryESQLDisabled} onClick={onTryESQL}>
      Try ES|QL
    </button>
  ),
}));

jest.mock('@kbn/esql-utils', () => ({
  getIndexForESQLQuery: jest.fn().mockResolvedValue('logs-*'),
  getESQLAdHocDataview: jest.fn().mockResolvedValue({ toSpec: () => ({}) }),
  getInitialESQLQuery: jest.fn().mockReturnValue('FROM logs-*'),
  getESQLQueryColumns: jest.fn().mockResolvedValue([]),
}));

jest.mock('@kbn/visualization-utils', () => ({
  getLensAttributesFromSuggestion: jest.fn().mockReturnValue({}),
}));

describe('DashboardAppNoDataPage', () => {
  const navigateToWithEmbeddablePackages = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (embeddableService.getStateTransfer as jest.Mock).mockReturnValue({
      navigateToWithEmbeddablePackages,
    });
  });

  it('keeps "Try ES|QL" disabled until the Lens state helpers resolve, then honours the click', async () => {
    const user = userEvent.setup();
    let resolveLensHelpers: (helpers: { suggestions: jest.Mock }) => void;
    (lensService!.stateHelperApi as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        resolveLensHelpers = resolve;
      })
    );

    render(<DashboardAppNoDataPage onDataViewCreated={jest.fn()} />);

    expect(await screen.findByRole('button', { name: 'Try ES|QL' })).toBeDisabled();
    expect(screen.getByTestId('dashboardNoDataPageLoading')).toBeInTheDocument();

    await act(async () => {
      resolveLensHelpers!({ suggestions: jest.fn().mockReturnValue([{}]) });
    });

    // the lazy page re-mounts on re-render, so query the button again
    const button = await screen.findByRole('button', { name: 'Try ES|QL' });
    expect(button).toBeEnabled();
    expect(screen.getByTestId('dashboardNoDataPageLoaded')).toBeInTheDocument();

    await user.click(button);

    await waitFor(() => expect(navigateToWithEmbeddablePackages).toHaveBeenCalledTimes(1));
  });

  it('keeps "Try ES|QL" disabled when the Lens state helpers are unavailable', async () => {
    (lensService!.stateHelperApi as jest.Mock).mockResolvedValue(null);

    render(<DashboardAppNoDataPage onDataViewCreated={jest.fn()} />);

    await screen.findByTestId('dashboardNoDataPageLoaded');
    expect(screen.getByRole('button', { name: 'Try ES|QL' })).toBeDisabled();
  });
});
