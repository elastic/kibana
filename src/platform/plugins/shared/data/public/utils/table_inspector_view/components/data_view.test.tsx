/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { InspectorViewDescription } from '@kbn/inspector-plugin/public';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import React, { Suspense } from 'react';
import userEvent from '@testing-library/user-event';
import { act, screen } from '@testing-library/react';
import { getTableViewDescription } from '..';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { TablesAdapter, type Datatable } from '@kbn/expressions-plugin/common';

jest.mock('@kbn/share-plugin/public', () => ({
  downloadMultipleAs: jest.fn(),
}));

jest.mock('../../../../common', () => ({
  datatableToCSV: jest.fn().mockReturnValue('csv'),
  tableHasFormulas: jest.fn().mockReturnValue(false),
}));

describe('Inspector Data View', () => {
  let DataView: InspectorViewDescription;

  const createDatatable = (value: number): Datatable => ({
    columns: [{ id: '1', name: 'column1', meta: { type: 'number' } }],
    rows: [{ '1': value }],
    type: 'datatable',
  });

  beforeEach(() => {
    DataView = getTableViewDescription(() => ({
      fieldFormats: {
        deserialize: jest.fn().mockReturnValue({ convertToText: (v: string) => v }),
      } as unknown as FieldFormatsStart,
      isFilterable: jest.fn(),
      uiActions: {} as UiActionsStart,
      uiSettings: { get: (_key: string, value: string) => value } as IUiSettingsClient,
    }));
  });

  it('should only show if data adapter is present', () => {
    const adapter = new TablesAdapter();

    expect(DataView.shouldShow?.({ tables: adapter })).toBe(true);
    expect(DataView.shouldShow?.({})).toBe(false);
  });

  describe('component', () => {
    let adapters: { tables: TablesAdapter };
    let InspectorDataView: NonNullable<InspectorViewDescription['component']>;

    const renderInspectorDataView = (
      ui: React.ReactElement,
      options?: { fallback?: React.ReactNode }
    ) => renderWithI18n(<Suspense fallback={options?.fallback ?? null}>{ui}</Suspense>);

    beforeEach(() => {
      adapters = { tables: new TablesAdapter() };
      InspectorDataView = DataView.component!;
    });

    it('should render loading state', async () => {
      renderInspectorDataView(<InspectorDataView adapters={adapters} title="Test Data" />, {
        fallback: <div>loading</div>,
      });

      expect(screen.getByText('loading')).toBeVisible();
      expect(await screen.findByText('No data available')).toBeVisible();
    });

    it('should render empty state', async () => {
      renderInspectorDataView(<InspectorDataView adapters={adapters} title="Test Data" />);

      expect(await screen.findByText('No data available')).toBeVisible();
      expect(screen.getByText('The element did not provide any data.')).toBeVisible();
    });

    it('should render single table without selector', async () => {
      renderInspectorDataView(<InspectorDataView adapters={adapters} title="Test Data" />);

      act(() => {
        adapters.tables.logDatatable('table1', createDatatable(123));
      });

      expect(await screen.findByText('column1')).toBeVisible();

      expect(screen.queryByText(/There are \d+ tables? in total/)).not.toBeInTheDocument();
      expect(screen.getByText('123')).toBeVisible();
      expect(screen.getByRole('button', { name: /Download CSV/i })).toBeVisible();
    });

    it('should support multiple datatables', async () => {
      const multitableAdapter = { tables: new TablesAdapter() };
      const user = userEvent.setup();

      renderInspectorDataView(<InspectorDataView adapters={multitableAdapter} title="Test Data" />);

      act(() => {
        multitableAdapter.tables.logDatatable('table1', createDatatable(123));
        multitableAdapter.tables.logDatatable('table2', createDatatable(456));
      });

      expect(await screen.findByText('There are 2 tables in total')).toBeVisible();
      expect(screen.getByText('Table 1')).toBeVisible();
      expect(screen.getByText('column1')).toBeVisible();
      expect(screen.getByText('123')).toBeVisible();

      await user.click(screen.getByText('Table 1'));
      await user.click(await screen.findByText('Table 2'));

      expect(screen.getByText('456')).toBeVisible();
    });
  });
});
