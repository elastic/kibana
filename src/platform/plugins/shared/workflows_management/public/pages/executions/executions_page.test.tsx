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
import { WorkflowExecutionsPage } from './executions_page';
import { createStartServicesMock } from '../../mocks';
import { getTestProvider } from '../../shared/mocks/test_providers';

// These tests can take more than the standard 5s Jest timeout
// when rendering UnifiedDataTable in jsdom (see elastic/kibana#269865).
const SPECIAL_TEST_TIMEOUT = 50_000;

describe('WorkflowExecutionsPage', () => {
  it(
    'renders the executions shell and stub grid',
    async () => {
      const services = createStartServicesMock();
      services.workflowsManagement.globalExecutionsView.enabled = true;

      render(<WorkflowExecutionsPage />, { wrapper: getTestProvider({ services }) });

      expect(screen.getByTestId('workflowExecutionsPage')).toBeInTheDocument();
      expect(screen.getByTestId('workflowExecutionsSearchFilterScaffold')).toBeInTheDocument();
      await screen.findByTestId('discoverDocTable');
    },
    SPECIAL_TEST_TIMEOUT
  );
});
