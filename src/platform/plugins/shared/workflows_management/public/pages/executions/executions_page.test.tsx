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
import { WORKFLOW_GLOBAL_EXECUTIONS_VIEW_FEATURE_FLAG_ID } from '@kbn/workflows/common/constants';
import { WorkflowExecutionsPage } from './executions_page';
import { createStartServicesMock } from '../../mocks';
import { getTestProvider } from '../../shared/mocks/test_providers';

describe('WorkflowExecutionsPage', () => {
  it('renders the executions shell and stub grid', async () => {
    const services = createStartServicesMock();
    services.uiSettings.get.mockImplementation((key: string, fallback?: unknown) =>
      key === WORKFLOW_GLOBAL_EXECUTIONS_VIEW_FEATURE_FLAG_ID ? true : fallback
    );

    render(<WorkflowExecutionsPage />, { wrapper: getTestProvider({ services }) });

    expect(screen.getByTestId('workflowExecutionsPage')).toBeInTheDocument();
    expect(screen.getByTestId('workflowExecutionsSearchFilterScaffold')).toBeInTheDocument();
    await screen.findByTestId('discoverDocTable');
  });
});
