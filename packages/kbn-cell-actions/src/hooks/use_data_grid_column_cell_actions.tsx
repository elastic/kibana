/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { MutableRefObject, useCallback, useMemo, useRef } from 'react';
import {
  EuiDataGridRefProps,
  EuiLoadingSpinner,
  type EuiDataGridColumnCellAction,
} from '@elastic/eui';
import type {
  CellAction,
  CellActionCompatibilityContext,
  CellActionExecutionContext,
  CellActionField,
  CellActionsProps,
  CellActionValue,
} from '../types';
import { useBulkLoadActions } from './use_load_actions';

type BulkField = Pick<CellActionField, 'name' | 'type'>;

export interface UseDataGridColumnsCellActionsProps
  extends Pick<CellActionsProps, 'metadata' | 'disabledActionTypes'> {
  /**
   * Optional trigger ID to used to retrieve the cell actions.
   * returns empty array if not provided
   */
  triggerId?: string;
  /**
   * fields array containing the column names and types, used to determine which actions to load.
   * returns empty array if not provided
   */
  fields?: BulkField[];
  /**
   * Function to get the cell value for a given field name and row index.
   * the `rowIndex` parameter is absolute, not relative to the current page
   */
  getCellValue: (fieldName: string, rowIndex: number) => CellActionValue;
  /**
   * ref to the EuiDataGrid instance
   */
  dataGridRef: MutableRefObject<EuiDataGridRefProps | null>;
}
export type UseDataGridColumnsCellActions<
  P extends UseDataGridColumnsCellActionsProps = UseDataGridColumnsCellActionsProps
> = (props: P) => EuiDataGridColumnCellAction[][];

// static actions array references to prevent React updates
const loadingColumnActions: EuiDataGridColumnCellAction[] = [
  () => <EuiLoadingSpinner size="s" data-test-subj="dataGridColumnCellAction-loading" />,
];
const emptyActions: EuiDataGridColumnCellAction[][] = [];

export const useDataGridColumnsCellActions: UseDataGridColumnsCellActions = ({
  fields,
  getCellValue,
  triggerId,
  metadata,
  dataGridRef,
  disabledActionTypes = [],
}) => {
  const bulkContexts: CellActionCompatibilityContext[] | undefined = useMemo(() => {
    if (!triggerId || !fields?.length) {
      return undefined;
    }
    return fields.map((field) => ({
      field,
      trigger: { id: triggerId },
      metadata,
    }));
  }, [fields, triggerId, metadata]);

  const { loading, value: columnsActions } = useBulkLoadActions(bulkContexts, {
    disabledActionTypes,
  });

  const columnsCellActions = useMemo<EuiDataGridColumnCellAction[][]>(() => {
    if (loading) {
      return fields?.length ? fields.map(() => loadingColumnActions) : emptyActions;
    }
    if (!triggerId || !columnsActions?.length || !fields?.length) {
      return emptyActions;
    }
    return columnsActions.map((actions, columnIndex) =>
      actions.map((action) =>
        createColumnCellAction({
          action,
          field: fields[columnIndex],
          getCellValue,
          metadata,
          triggerId,
          dataGridRef,
        })
      )
    );
  }, [columnsActions, fields, getCellValue, loading, metadata, triggerId, dataGridRef]);

  return columnsCellActions;
};

interface CreateColumnCellActionParams
  extends Pick<UseDataGridColumnsCellActionsProps, 'getCellValue' | 'metadata' | 'dataGridRef'> {
  field: BulkField;
  triggerId: string;
  action: CellAction;
}
const createColumnCellAction = ({
  action,
  field,
  getCellValue,
  metadata,
  triggerId,
  dataGridRef,
}: CreateColumnCellActionParams): EuiDataGridColumnCellAction =>
  function ColumnCellAction({ Component, rowIndex, isExpanded }) {
    const nodeRef = useRef<HTMLAnchorElement | null>(null);
    const buttonRef = useRef<HTMLAnchorElement | null>(null);

    const actionContext: CellActionExecutionContext = useMemo(() => {
      const { name, type } = field;
      const value = getCellValue(name, rowIndex);
      return {
        field: { name, type, value },
        trigger: { id: triggerId },
        nodeRef,
        metadata,
      };
    }, [rowIndex]);

    const onClick = useCallback(async () => {
      actionContext.nodeRef.current = await closeAndGetCellElement({
        dataGrid: dataGridRef.current,
        isExpanded,
        buttonRef,
      });
      action.execute(actionContext);
    }, [actionContext, isExpanded]);

    return (
      <Component
        buttonRef={buttonRef}
        aria-label={action.getDisplayName(actionContext)}
        title={action.getDisplayName(actionContext)}
        data-test-subj={`dataGridColumnCellAction-${action.id}`}
        iconType={action.getIconType(actionContext)!}
        onClick={onClick}
      >
        {action.getDisplayName(actionContext)}
      </Component>
    );
  };

const closeAndGetCellElement = ({
  dataGrid,
  isExpanded,
  buttonRef,
}: {
  dataGrid?: EuiDataGridRefProps | null;
  isExpanded: boolean;
  buttonRef: MutableRefObject<HTMLAnchorElement | null>;
}): Promise<HTMLElement | null> =>
  new Promise((resolve) => {
    const gridCellElement = isExpanded
      ? // if actions popover is expanded the button is outside dataGrid, using euiDataGridRowCell--open class
        document.querySelector('div[role="gridcell"].euiDataGridRowCell--open')
      : // if not expanded the button is inside the cell, get the parent cell from the button
        getParentCellElement(buttonRef.current);
    // close the popover if needed
    dataGrid?.closeCellPopover();
    // closing the popover updates the cell content, get the first child after all updates
    setTimeout(() => {
      resolve((gridCellElement?.firstElementChild as HTMLElement) ?? null);
    });
  });

const getParentCellElement = (element?: HTMLElement | null): HTMLElement | null => {
  if (element == null) {
    return null;
  }
  if (element.nodeName === 'div' && element.getAttribute('role') === 'gridcell') {
    return element;
  }
  return getParentCellElement(element.parentElement);
};
