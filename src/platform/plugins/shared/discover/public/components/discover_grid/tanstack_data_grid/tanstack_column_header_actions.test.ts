/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataViewMockWithTimeField } from '@kbn/discover-utils/src/__mocks__';
import { buildTanStackColumnHeaderActions } from './tanstack_column_header_actions';

describe('buildTanStackColumnHeaderActions', () => {
  const toastNotifications = {
    addInfo: jest.fn(),
    addWarning: jest.fn(),
  };

  it('includes remove, sort, move, and copy actions for sortable columns', () => {
    const persistVisibleColumns = jest.fn();
    const onSort = jest.fn();

    const actions = buildTanStackColumnHeaderActions({
      columnId: '@timestamp',
      columnIndex: 1,
      visibleColumnIds: ['message', '@timestamp', 'extension'],
      dataView: dataViewMockWithTimeField,
      columnSizing: {},
      isSummaryMode: false,
      isSortEnabled: true,
      sort: [],
      onSort,
      persistVisibleColumns,
      toastNotifications: toastNotifications as never,
      valueToStringConverter: jest.fn(() => ({ formattedString: 'value', withFormula: false })),
      rowsCount: 10,
      hasEditDataViewPermission: () => false,
      onActionComplete: jest.fn(),
    });

    expect(actions.map((action) => action['data-test-subj'])).toEqual([
      'unifiedDataTableRemoveColumn',
      'gridSortAscendingButton',
      'gridSortDescendingButton',
      'gridMoveColumnLeftButton',
      'gridMoveColumnRightButton',
      'gridCopyColumnNameToClipBoardButton',
      'gridCopyColumnValuesToClipBoardButton',
    ]);
  });

  it('does not include remove or move actions in summary mode', () => {
    const actions = buildTanStackColumnHeaderActions({
      columnId: '_source',
      columnIndex: 0,
      visibleColumnIds: ['_source'],
      dataView: dataViewMockWithTimeField,
      columnSizing: {},
      isSummaryMode: true,
      isSortEnabled: false,
      sort: [],
      persistVisibleColumns: jest.fn(),
      toastNotifications: toastNotifications as never,
      valueToStringConverter: jest.fn(() => ({ formattedString: 'value', withFormula: false })),
      rowsCount: 10,
      hasEditDataViewPermission: () => false,
      onActionComplete: jest.fn(),
    });

    expect(actions.map((action) => action['data-test-subj'])).toEqual([
      'gridCopyColumnValuesToClipBoardButton',
    ]);
  });
});
