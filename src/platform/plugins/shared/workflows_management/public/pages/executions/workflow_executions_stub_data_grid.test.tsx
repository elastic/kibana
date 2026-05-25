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
import { WorkflowExecutionsStubDataGrid } from './workflow_executions_stub_data_grid';
import { createStartServicesMock } from '../../mocks';
import { getTestProvider } from '../../shared/mocks/test_providers';

jest.mock('@kbn/unified-data-table', () => ({
  UnifiedDataTable: () => <div data-test-subj="discoverDocTable" />,
  DataLoadingState: { loading: 'loading', loaded: 'loaded' },
}));

describe('WorkflowExecutionsStubDataGrid', () => {
  it('renders the stub data grid table', () => {
    const services = createStartServicesMock();

    render(<WorkflowExecutionsStubDataGrid services={services} />, {
      wrapper: getTestProvider({ services }),
    });

    expect(screen.getByTestId('discoverDocTable')).toBeInTheDocument();
  });
});
