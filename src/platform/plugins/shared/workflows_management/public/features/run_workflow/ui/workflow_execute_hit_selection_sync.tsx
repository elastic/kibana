/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useContext, useEffect, useRef } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { UnifiedDataTableContext } from '@kbn/unified-data-table';

export interface WorkflowExecuteHitSelectionSyncProps {
  dataTableRows: DataTableRecord[];
  onSelectionChange: (selectedRecords: DataTableRecord[]) => void;
  setErrors?: (errors: string | null) => void;
}

/**
 * Mirrors UnifiedDataTable checkbox selection into parent form state (alert / document tabs).
 */
export const WorkflowExecuteHitSelectionSync = ({
  dataTableRows,
  onSelectionChange,
  setErrors,
}: WorkflowExecuteHitSelectionSyncProps) => {
  const { selectedDocsState } = useContext(UnifiedDataTableContext);
  const selectedStateRef = useRef(selectedDocsState);
  selectedStateRef.current = selectedDocsState;

  const docIdsKey = (selectedDocsState?.docIdsInSelectionOrder ?? []).join('\0');

  useEffect(() => {
    const docIds = selectedStateRef.current?.docIdsInSelectionOrder ?? [];
    if (docIds.length === 0) {
      onSelectionChange([]);
      setErrors?.(null);
      return;
    }

    const selectedRecords = docIds
      .map((docId) => dataTableRows.find((row) => row.id === docId))
      .filter((row): row is DataTableRecord => row !== undefined);

    if (selectedRecords.length !== docIds.length) {
      onSelectionChange([]);
      setErrors?.(null);
      return;
    }

    onSelectionChange(selectedRecords);
    setErrors?.(null);
  }, [dataTableRows, docIdsKey, onSelectionChange, setErrors]);

  return null;
};

WorkflowExecuteHitSelectionSync.displayName = 'WorkflowExecuteHitSelectionSync';
