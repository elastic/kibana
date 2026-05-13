/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { I18nProviderMock } from '@kbn/core-i18n-browser-mocks/src/i18n_context_mock';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { MemoryRouter, Route, Routes } from '@kbn/shared-ux-router';
import { WORKFLOW_GLOBAL_EXECUTIONS_VIEW_FEATURE_FLAG_ID } from '@kbn/workflows/common/constants';
import { WorkflowExecutionsRouteGate } from './workflow_executions_route_gate';
import { createStartServicesMock } from '../mocks';

jest.mock('../pages/executions', () => ({
  WorkflowExecutionsPage: () => <div data-test-subj="workflowExecutionsPage" />,
}));

const WorkflowsHomeStub = () => <div data-test-subj="workflowsHomeStub" />;

describe('WorkflowExecutionsRouteGate', () => {
  const renderGate = (services: ReturnType<typeof createStartServicesMock>) =>
    render(
      <KibanaContextProvider services={services}>
        <I18nProviderMock>
          <MemoryRouter initialEntries={['/executions']}>
            <Routes>
              <Route path="/executions" exact component={WorkflowExecutionsRouteGate} />
              <Route path="/" exact component={WorkflowsHomeStub} />
            </Routes>
          </MemoryRouter>
        </I18nProviderMock>
      </KibanaContextProvider>
    );

  it('redirects to workflows home when the executions view feature flag is off', () => {
    const services = createStartServicesMock();
    services.uiSettings.get.mockImplementation((key: string, fallback?: unknown) =>
      key === WORKFLOW_GLOBAL_EXECUTIONS_VIEW_FEATURE_FLAG_ID ? false : fallback
    );

    renderGate(services);

    expect(screen.queryByTestId('workflowExecutionsPage')).not.toBeInTheDocument();
    expect(screen.getByTestId('workflowsHomeStub')).toBeInTheDocument();
  });

  it('renders the executions page when the executions view feature flag is on', () => {
    const services = createStartServicesMock();
    services.uiSettings.get.mockImplementation((key: string, fallback?: unknown) =>
      key === WORKFLOW_GLOBAL_EXECUTIONS_VIEW_FEATURE_FLAG_ID ? true : fallback
    );

    renderGate(services);

    expect(screen.getByTestId('workflowExecutionsPage')).toBeInTheDocument();
  });
});
