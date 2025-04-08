/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { render } from '@testing-library/react';
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
    const component = mountWithIntl(
      <StatusTable statuses={[{ id: 'plugin:1', state, original: createServiceStatus() }]} />
    );
    const table = component.find('EuiInMemoryTable');
    expect(table.prop('columns')).toEqual([
      {
        align: 'center',
        field: 'state',
        name: 'Status',
        render: expect.any(Function),
        sortable: expect.any(Function),
        width: '100px',
      },
      {
        field: 'id',
        name: 'ID',
        sortable: true,
      },
      {
        field: 'state',
        name: 'Status summary',
        render: expect.any(Function),
      },
      {
        align: 'right',
        isExpander: true,
        name: expect.any(Object), // Matches the <EuiScreenReaderOnly> component
        render: expect.any(Function),
        width: '40px',
      },
    ]);
    expect(table.prop('items')).toEqual([
      {
        id: 'plugin:1',
        original: {
          level: 'available',
          summary: 'Ready',
        },
        state: {
          id: 'available',
          message: 'Ready',
          title: 'green',
          uiColor: 'success',
        },
      },
    ]);
    expect(table.prop('sorting')).toEqual({
      sort: {
        direction: 'asc',
        field: 'state',
      },
    });
    expect(table.prop('data-test-subj')).toBe('statusBreakdown');
  });

  it('renders empty when statuses is not provided', () => {
    const { container } = render(<StatusTable />);
    expect(container.firstChild).toBeNull();
  });
});
