/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createGridColumns } from './table_vis_columns';
import type { FormattedColumns } from '../types';
import type { DatatableColumn, DatatableRow } from '@kbn/expressions-plugin/common';

describe('createGridColumns', () => {
  const columns: DatatableColumn[] = [
    { id: 'col-a', name: 'Column A', meta: { type: 'string' } },
    { id: 'col-b', name: 'Column B', meta: { type: 'number' } },
  ];
  const rows: DatatableRow[] = [
    { 'col-a': 'foo', 'col-b': 42 },
    { 'col-a': 'bar', 'col-b': 99 },
  ];
  const formattedColumns: FormattedColumns = {
    'col-a': {
      title: 'Column A',
      formatter: { convertToText: jest.fn((v) => String(v)) } as any,
      filterable: true,
    },
    'col-b': {
      title: 'Column B',
      formatter: { convertToText: jest.fn((v) => String(v)) } as any,
      filterable: false,
    },
  };
  const columnsWidth = [{ colIndex: 0, width: 120 }];
  const fireEvent = jest.fn();

  describe('interactive mode (isInteractive = true, the default)', () => {
    it('sets column actions with sort options', () => {
      const result = createGridColumns(columns, rows, formattedColumns, columnsWidth, fireEvent);

      result.forEach((col) => {
        expect(col.actions).not.toBe(false);
        expect(col.actions).toMatchObject({
          showHide: false,
          showMoveLeft: false,
          showMoveRight: false,
          showSortAsc: expect.objectContaining({ label: expect.any(String) }),
          showSortDesc: expect.objectContaining({ label: expect.any(String) }),
        });
      });
    });

    it('sets cellActions for filterable columns and undefined for non-filterable', () => {
      const result = createGridColumns(columns, rows, formattedColumns, columnsWidth, fireEvent);

      const filterable = result.find((c) => c.id === 'col-a')!;
      const nonFilterable = result.find((c) => c.id === 'col-b')!;

      expect(filterable.cellActions).toHaveLength(2);
      expect(nonFilterable.cellActions).toBeUndefined();
    });

    it('marks columns as resizable', () => {
      const result = createGridColumns(columns, rows, formattedColumns, columnsWidth, fireEvent);

      result.forEach((col) => {
        expect(col.isResizable).toBe(true);
      });
    });

    it('applies initialWidth from columnsWidth', () => {
      const result = createGridColumns(columns, rows, formattedColumns, columnsWidth, fireEvent);

      expect(result[0].initialWidth).toBe(120);
      expect(result[1].initialWidth).toBeUndefined();
    });
  });

  describe('preview mode (isInteractive = false)', () => {
    it('disables column actions', () => {
      const result = createGridColumns(
        columns,
        rows,
        formattedColumns,
        columnsWidth,
        fireEvent,
        undefined,
        false
      );

      result.forEach((col) => {
        expect(col.actions).toBe(false);
      });
    });

    it('removes cellActions even for filterable columns', () => {
      const result = createGridColumns(
        columns,
        rows,
        formattedColumns,
        columnsWidth,
        fireEvent,
        undefined,
        false
      );

      result.forEach((col) => {
        expect(col.cellActions).toBeUndefined();
      });
    });

    it('marks columns as not resizable', () => {
      const result = createGridColumns(
        columns,
        rows,
        formattedColumns,
        columnsWidth,
        fireEvent,
        undefined,
        false
      );

      result.forEach((col) => {
        expect(col.isResizable).toBe(false);
      });
    });

    it('still applies initialWidth from columnsWidth', () => {
      const result = createGridColumns(
        columns,
        rows,
        formattedColumns,
        columnsWidth,
        fireEvent,
        undefined,
        false
      );

      expect(result[0].initialWidth).toBe(120);
      expect(result[1].initialWidth).toBeUndefined();
    });
  });
});
