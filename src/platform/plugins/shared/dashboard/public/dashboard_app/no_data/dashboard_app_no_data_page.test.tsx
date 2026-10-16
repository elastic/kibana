/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { embeddableService, lensService } from '../../services/kibana_services';
import { DashboardAppNoDataPage } from './dashboard_app_no_data';

jest.mock('@kbn/shared-ux-page-analytics-no-data', () => ({
  AnalyticsNoDataPageKibanaProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  AnalyticsNoDataPage: ({ onTryESQL }: { onTryESQL: () => void }) => (
    <button onClick={onTryESQL}>Try ES|QL</button>
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

  it('honours a "Try ES|QL" click dispatched before the Lens state helpers resolve', async () => {
    let resolveLensHelpers: (helpers: { suggestions: jest.Mock }) => void;
    (lensService!.stateHelperApi as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        resolveLensHelpers = resolve;
      })
    );

    render(<DashboardAppNoDataPage onDataViewCreated={jest.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Try ES|QL' }));
    expect(navigateToWithEmbeddablePackages).not.toHaveBeenCalled();

    resolveLensHelpers!({ suggestions: jest.fn().mockReturnValue([{}]) });

    await waitFor(() => expect(navigateToWithEmbeddablePackages).toHaveBeenCalledTimes(1));
    // the click must await the in-flight call rather than start a second, non-reentrant one
    expect(lensService!.stateHelperApi).toHaveBeenCalledTimes(1);
  });
});
