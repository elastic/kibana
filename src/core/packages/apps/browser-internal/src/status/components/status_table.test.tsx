/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import '@testing-library/jest-dom';
import type { StatusInfoServiceStatus as ServiceStatus } from '@kbn/core-status-common';
import { StatusTable } from './status_table';

const state = {
  id: 'available' as const,
  uiColor: 'success',
  message: 'Ready',
  title: 'green',
};
const state2 = {
  id: 'degraded' as const,
  uiColor: 'warning',
  message: 'Not ready',
  title: 'yellow',
};

const createServiceStatus = (parts: Partial<ServiceStatus> = {}): ServiceStatus => ({
  level: 'available',
  summary: 'Ready',
  ...parts,
});

describe('StatusTable', () => {
  it('renders when statuses is provided', () => {
    const { getByTestId, getByText } = renderWithI18n(
      <StatusTable
        statuses={[
          { id: 'plugin:1', state, original: createServiceStatus() },
          {
            id: 'plugin:2',
            state: state2,
            original: createServiceStatus({ level: 'degraded', summary: 'Not ready' }),
          },
        ]}
      />
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

    // Verify header row contents
    const headerRow = table.querySelector('thead tr');
    expect(headerRow).toBeInTheDocument();
    expect(headerRow).toHaveTextContent('Status');
    expect(headerRow).toHaveTextContent('ID');
    expect(headerRow).toHaveTextContent('Status summary');
    expect(headerRow).toHaveTextContent('Expand row');

    // Verify sorting by checking row order
    const rows = table.querySelectorAll('tr');
    expect(rows).toHaveLength(3); // 1 header row + 2 data rows
    expect(rows[1]).toHaveTextContent('plugin:2');
    expect(rows[1]).toHaveTextContent('Not ready');
    expect(rows[1].className).toContain('status-table-row-warning');

    expect(rows[2]).toHaveTextContent('plugin:1');
    expect(rows[2]).toHaveTextContent('Ready');
    expect(rows[2].className).toContain('status-table-row-success');
  });

  it('renders empty when statuses is not provided', () => {
    const { container } = renderWithI18n(<StatusTable />);
    expect(container.firstChild).toBeNull();
  });
});
