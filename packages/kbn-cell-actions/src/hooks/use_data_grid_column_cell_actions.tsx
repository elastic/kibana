/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useRef } from 'react';
import {
  EuiDataGridColumnCellAction,
  EuiDataGridColumnCellActionProps,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { CellActionExecutionContext, CellActionField, CellActionsProps } from '../types';
import { useBulkLoadActions } from './use_load_actions';

interface BulkField extends Pick<CellActionField, 'name' | 'type'> {
  /**
   * Array containing all the values of the field for that page, indexed by rowIndex
   */
  values: Array<string | string[] | null | undefined>;
}

export interface UseDataGridColumnsCellActionsProps
  extends Pick<CellActionsProps, 'triggerId' | 'showActionTooltips' | 'metadata'> {
  fields: BulkField[];
  pageSize: number;
}
export const useDataGridColumnsCellActions = ({
  fields,
  triggerId,
  pageSize,
  metadata,
}: UseDataGridColumnsCellActionsProps): EuiDataGridColumnCellAction[][] => {
  const bulkContexts: CellActionExecutionContext[] = useMemo(
    () =>
      fields.map(({ values, ...field }) => ({
        field,
        trigger: { id: triggerId },
        metadata,
      })),
    [fields, triggerId, metadata]
  );

  const { loading, value: columnsActions } = useBulkLoadActions(bulkContexts);

  const columnsCellActions = useMemo<EuiDataGridColumnCellAction[][]>(() => {
    if (loading) {
      return fields.map(() => [() => <EuiLoadingSpinner size="s" />]);
    }
    if (!columnsActions) {
      return [];
    }
    return columnsActions.map((actions, columnIndex) =>
      actions.map<EuiDataGridColumnCellAction>(
        (action) =>
          function ColumnCellAction({
            Component,
            rowIndex,
            isExpanded,
          }: EuiDataGridColumnCellActionProps) {
            const nodeRef = useRef<HTMLElement | null>(null);
            const extraContentNodeRef = useRef<HTMLDivElement | null>(null);

            // rowIndex refers to all pages, the row index relative to the page is needed in order to get the value
            const pageRowIndex = rowIndex % pageSize;
            const value = fields[columnIndex].values[pageRowIndex];

            const actionContext: CellActionExecutionContext = {
              field: { ...fields[columnIndex], value },
              trigger: { id: triggerId },
              extraContentNodeRef,
              nodeRef,
              metadata: { ...metadata, isExpanded },
            };

            return (
              <Component
                buttonRef={() => nodeRef}
                aria-label={action.getDisplayName(actionContext)}
                title={action.getDisplayName(actionContext)}
                data-test-subj={`dataGridColumnCellAction-${action.id}`}
                iconType={action.getIconType(actionContext)!}
                onClick={() => {
                  action.execute(actionContext);
                }}
              >
                {action.getDisplayName(actionContext)}
                <div ref={() => extraContentNodeRef} />
              </Component>
            );
          }
      )
    );
  }, [columnsActions, fields, loading, metadata, pageSize, triggerId]);

  return columnsCellActions;
};
