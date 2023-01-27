/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useRef } from 'react';
import { EuiLoadingSpinner, type EuiDataGridColumnCellAction } from '@elastic/eui';
import type {
  CellAction,
  CellActionCompatibilityContext,
  CellActionExecutionContext,
  CellActionField,
  CellActionsProps,
} from '../types';
import { useBulkLoadActions } from './use_load_actions';

interface BulkField extends Pick<CellActionField, 'name' | 'type'> {
  /**
   * Array containing all the values of the field in the visible page, indexed by rowIndex
   */
  values: Array<string | string[] | null | undefined>;
}

export interface UseDataGridColumnsCellActionsProps
  extends Pick<CellActionsProps, 'triggerId' | 'metadata'> {
  fields: BulkField[];
}
export const useDataGridColumnsCellActions = ({
  fields,
  triggerId,
  metadata,
}: UseDataGridColumnsCellActionsProps): EuiDataGridColumnCellAction[][] => {
  const bulkContexts: CellActionCompatibilityContext[] = useMemo(
    () =>
      fields.map(({ values, ...field }) => ({
        field, // we are getting the actions for the whole column field, so the compatibility check will be done without the value
        trigger: { id: triggerId },
        metadata,
      })),
    [fields, triggerId, metadata]
  );

  const { loading, value: columnsActions } = useBulkLoadActions(bulkContexts);

  const columnsCellActions = useMemo<EuiDataGridColumnCellAction[][]>(() => {
    if (loading) {
      return fields.map(() => [
        () => <EuiLoadingSpinner size="s" data-test-subj="dataGridColumnCellAction-loading" />,
      ]);
    }
    if (!columnsActions) {
      return [];
    }
    return columnsActions.map((actions, columnIndex) =>
      actions.map((action) =>
        createColumnCellAction({ action, metadata, triggerId, field: fields[columnIndex] })
      )
    );
  }, [columnsActions, fields, loading, metadata, triggerId]);

  return columnsCellActions;
};

interface CreateColumnCellActionParams extends Pick<CellActionsProps, 'triggerId' | 'metadata'> {
  field: BulkField;
  action: CellAction;
}
const createColumnCellAction = ({
  field,
  action,
  metadata,
  triggerId,
}: CreateColumnCellActionParams): EuiDataGridColumnCellAction =>
  function ColumnCellAction({ Component, rowIndex }) {
    const nodeRef = useRef<HTMLAnchorElement | null>(null);
    const extraContentNodeRef = useRef<HTMLDivElement | null>(null);

    const { name, type, values } = field;
    // rowIndex refers to all pages, we need to use the row index relative to the page to get the value
    const value = values[rowIndex % values.length];

    const actionContext: CellActionExecutionContext = {
      field: { name, type, value },
      trigger: { id: triggerId },
      extraContentNodeRef,
      nodeRef,
      metadata,
    };

    return (
      <Component
        buttonRef={nodeRef}
        aria-label={action.getDisplayName(actionContext)}
        title={action.getDisplayName(actionContext)}
        data-test-subj={`dataGridColumnCellAction-${action.id}`}
        iconType={action.getIconType(actionContext)!}
        onClick={() => {
          action.execute(actionContext);
        }}
      >
        {action.getDisplayName(actionContext)}
        <div ref={extraContentNodeRef} />
      </Component>
    );
  };
