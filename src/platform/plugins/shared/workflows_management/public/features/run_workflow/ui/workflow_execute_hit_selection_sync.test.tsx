/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render } from '@testing-library/react';
import React from 'react';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { UnifiedDataTableContext } from '@kbn/unified-data-table/src/table_context';
import type { DataTableContext } from '@kbn/unified-data-table/src/table_context';
import { WorkflowExecuteHitSelectionSync } from './workflow_execute_hit_selection_sync';

const row: DataTableRecord = {
  id: 'logs-*::doc-1::',
  raw: { _id: 'doc-1', _index: 'logs-*', _source: { message: 'hello' } },
  flattened: {},
};

const renderSelectionSync = ({
  dataTableRows,
  docIdsInSelectionOrder,
  onSelectionChange = jest.fn(),
  setErrors = jest.fn(),
}: {
  dataTableRows: DataTableRecord[];
  docIdsInSelectionOrder: string[];
  onSelectionChange?: (selectedRecords: DataTableRecord[]) => void;
  setErrors?: (errors: string | null) => void;
}) => {
  const contextValue = {
    selectedDocsState: { docIdsInSelectionOrder },
  } as DataTableContext;

  render(
    <UnifiedDataTableContext.Provider value={contextValue}>
      <WorkflowExecuteHitSelectionSync
        dataTableRows={dataTableRows}
        onSelectionChange={onSelectionChange}
        setErrors={setErrors}
      />
    </UnifiedDataTableContext.Provider>
  );

  return { onSelectionChange, setErrors };
};

describe('WorkflowExecuteHitSelectionSync', () => {
  it('clears selection when no doc ids are selected', () => {
    const onSelectionChange = jest.fn();
    const setErrors = jest.fn();

    renderSelectionSync({
      dataTableRows: [row],
      docIdsInSelectionOrder: [],
      onSelectionChange,
      setErrors,
    });

    expect(onSelectionChange).toHaveBeenCalledWith([]);
    expect(setErrors).toHaveBeenCalledWith(null);
  });

  it('mirrors resolved selected rows', () => {
    const onSelectionChange = jest.fn();

    renderSelectionSync({
      dataTableRows: [row],
      docIdsInSelectionOrder: [row.id],
      onSelectionChange,
    });

    expect(onSelectionChange).toHaveBeenCalledWith([row]);
  });

  it('clears selection when selected doc ids no longer resolve after refresh', () => {
    const onSelectionChange = jest.fn();
    const setErrors = jest.fn();

    renderSelectionSync({
      dataTableRows: [row],
      docIdsInSelectionOrder: ['logs-*::missing::'],
      onSelectionChange,
      setErrors,
    });

    expect(onSelectionChange).toHaveBeenCalledWith([]);
    expect(setErrors).toHaveBeenCalledWith(null);
  });

  it('clears selection when only some selected doc ids resolve', () => {
    const onSelectionChange = jest.fn();

    renderSelectionSync({
      dataTableRows: [row],
      docIdsInSelectionOrder: [row.id, 'logs-*::missing::'],
      onSelectionChange,
    });

    expect(onSelectionChange).toHaveBeenCalledWith([]);
  });
});
