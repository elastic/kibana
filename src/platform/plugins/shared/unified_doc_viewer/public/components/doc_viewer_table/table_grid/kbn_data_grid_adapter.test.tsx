/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@elastic/eui/lib/test/rtl';
import axe, { type AxeResults } from 'axe-core';
import { KBN_DATA_GRID_ENABLED_FEATURE_FLAG_KEY } from '@kbn/discover-utils';
import { buildDataViewMock, deepMockedFields } from '@kbn/discover-utils/src/__mocks__';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { mockDataGridLayout } from '@kbn/discover-data-grid/mocks';
import { buildHitMock, mockUnifiedDocViewerServices } from '../../../__mocks__';
import { setUnifiedDocViewerServices } from '../../../plugin';
import { FieldRow } from '../field_row';
import { TableGrid, type TableGridProps } from '../table_grid';

setUnifiedDocViewerServices(mockUnifiedDocViewerServices);

const mockDataView = buildDataViewMock({ name: 'data-view-mock', fields: deepMockedFields });
const mockHit = buildHitMock({}, 'index', mockDataView);

const buildFieldRow = (name: string, value: string): FieldRow =>
  new FieldRow({
    name,
    displayNameOverride: name,
    flattenedValue: value,
    hit: mockHit,
    dataView: buildDataViewMock({ name: 'apm-span-data-view', fields: undefined }),
    fieldFormats: fieldFormatsServiceMock.createStartContract(),
    isPinned: false,
    dataSource: undefined,
  });

const buildRows = (count: number): FieldRow[] =>
  Array.from({ length: count }, (_, index) => buildFieldRow(`field${index}`, `value${index}`));

const defaultProps: TableGridProps = {
  id: 'test-table',
  containerWidth: 800,
  rows: buildRows(2),
  isEsqlMode: false,
};

const renderGrid = (props: Partial<TableGridProps> = {}) =>
  render(<TableGrid {...defaultProps} {...props} />);

const getMountedFieldRows = () => screen.getAllByRole('row').slice(1);

const expectNoAxeViolations = async (container: HTMLElement) => {
  // The grid's live region updates on a timer after mounting, while axe is still running.
  const { violations }: AxeResults = await act(() =>
    axe.run(container, {
      // JSDOM has no layout or computed colors, so contrast cannot be evaluated.
      rules: { 'color-contrast': { enabled: false } },
    })
  );
  expect(
    violations.map(({ id, nodes }) => ({ id, targets: nodes.map(({ target }) => target) }))
  ).toEqual([]);
};

describe('KbnDataGridAdapter', () => {
  let restoreLayout: () => void;

  const { featureFlags } = mockUnifiedDocViewerServices.core;

  beforeEach(() => {
    restoreLayout = mockDataGridLayout();
    jest
      .mocked(featureFlags.useBooleanValue)
      .mockImplementation((flagName, fallback) =>
        flagName === KBN_DATA_GRID_ENABLED_FEATURE_FLAG_KEY ? true : fallback
      );
  });

  afterEach(() => {
    restoreLayout();
    jest.mocked(featureFlags.useBooleanValue).mockImplementation((_, fallback) => fallback);
  });

  describe('rendering', () => {
    it('renders the fields and their values as a named grid with Field and Value columns', () => {
      renderGrid();

      const grid = screen.getByRole('grid', { name: 'Field values' });
      expect(
        within(grid)
          .getAllByRole('columnheader')
          .map(({ textContent }) => textContent)
      ).toEqual([expect.stringContaining('Field'), expect.stringContaining('Value')]);
      expect(within(grid).getByRole('gridcell', { name: /field0/ })).toBeVisible();
      expect(within(grid).getByRole('gridcell', { name: 'value0' })).toBeVisible();
      expect(within(grid).getByRole('gridcell', { name: /field1/ })).toBeVisible();
      expect(within(grid).getByRole('gridcell', { name: 'value1' })).toBeVisible();
    });

    it('marks the grid with the product test subject', () => {
      renderGrid();

      expect(screen.getByTestId('UnifiedDocViewerTableGrid')).toBe(
        screen.getByRole('grid', { name: 'Field values' })
      );
    });

    it('renders a custom cell renderer in place of the default cell content', () => {
      renderGrid({ renderCell: ({ row }) => <span>{`Custom ${row.name}`}</span> });

      expect(screen.getAllByText('Custom field0')).toHaveLength(2);
    });
  });

  describe('row and column identity', () => {
    it('keeps the logical active cell on the same field when the rows are reordered', async () => {
      const user = userEvent.setup();
      const [field0, field1, field2] = buildRows(3);
      const { rerender } = renderGrid({ rows: [field0, field1, field2] });

      await user.click(screen.getByRole('gridcell', { name: 'value0' }));
      rerender(<TableGrid {...defaultProps} rows={[field1, field2, field0]} />);

      expect(screen.getByRole('gridcell', { name: 'value0' })).toHaveFocus();
      // field0 is now the last row, below field2.
      await user.keyboard('{ArrowUp}');
      expect(screen.getByRole('gridcell', { name: 'value2' })).toHaveFocus();
      await user.keyboard('{ArrowLeft}');
      expect(screen.getByRole('gridcell', { name: /field2/ })).toHaveFocus();
    });
  });

  describe('virtualization', () => {
    it('mounts a bounded number of rows regardless of the number of fields', () => {
      renderGrid({ rows: buildRows(1000) });

      const grid = screen.getByRole('grid');
      expect(grid).toHaveAttribute('aria-rowcount', '1001');
      expect(getMountedFieldRows().length).toBeGreaterThan(5);
      expect(getMountedFieldRows().length).toBeLessThan(30);
      expect(screen.queryByText('value999')).toBeNull();
    });
  });

  describe('copying', () => {
    it.each([
      { cell: 'field name', name: /field0/, copiedText: 'field0' },
      { cell: 'field value', name: 'value0', copiedText: 'value0' },
    ])('copies the plain-text $cell of the focused cell', async ({ name, copiedText }) => {
      const user = userEvent.setup();
      renderGrid();
      const cell = screen.getByRole('gridcell', { name });
      await user.click(cell);
      const setData = jest.fn();

      // user-event's copy() dispatches nothing without a text selection.
      fireEvent.copy(cell, { clipboardData: { setData } });

      expect(setData).toHaveBeenCalledWith('text/plain', copiedText);
      await screen.findByText('Cell value copied.');
    });
  });

  describe('accessibility', () => {
    it('has no axe violations in the default state', async () => {
      const { container } = renderGrid();

      await expectNoAxeViolations(container);
    });
  });
});
