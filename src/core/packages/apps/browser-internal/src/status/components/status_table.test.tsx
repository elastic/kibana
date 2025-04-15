/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderReactTestingLibraryWithI18n } from '@kbn/test-jest-helpers';
import '@testing-library/jest-dom';
import type { StatusInfoServiceStatus as ServiceStatus } from '@kbn/core-status-common';
import { StatusTable } from './status_table';

const state = {
  id: 'available' as const,
  uiColor: 'success',
  message: 'Ready',
  title: 'green',
};

const createServiceStatus = (parts: Partial<ServiceStatus> = {}): ServiceStatus => ({
  level: 'available',
  summary: 'Ready',
  ...parts,
});

describe('StatusTable', () => {
  it('renders when statuses is provided', () => {
    const { getByTestId, getByText } = renderReactTestingLibraryWithI18n(
      <StatusTable statuses={[{ id: 'plugin:1', state, original: createServiceStatus() }]} />
    );

    const table = getByTestId('statusBreakdown');

    // Verify table exists
    expect(table).toBeInTheDocument();

    // Verify columns
    expect(getByText('Status')).toBeInTheDocument();
    expect(getByText('ID')).toBeInTheDocument();
    expect(getByText('Status summary')).toBeInTheDocument();

    // Verify items
    expect(getByText('plugin:1')).toBeInTheDocument();
    expect(getByText('Ready')).toBeInTheDocument();

    // Verify sorting by checking row order
    const rows = table.querySelectorAll('tr');
    expect(rows[1]).toHaveTextContent('plugin:1');
    expect(rows[1]).toHaveTextContent('Ready');
  });

  it('renders empty when statuses is not provided', () => {
    const { container } = renderReactTestingLibraryWithI18n(<StatusTable />);
    expect(container.firstChild).toBeNull();
  });
});
