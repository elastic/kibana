/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MutableRefObject } from 'react';
import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import type { EuiDataGridRefProps } from '@elastic/eui';
import { type EuiDataGridColumnCellAction } from '@elastic/eui';
import type { FieldSpec } from '@kbn/data-views-plugin/common';
import type {
  CellAction,
  CellActionCompatibilityContext,
  CellActionExecutionContext,
  CellActionsProps,
  CellActionFieldValue,
} from '../types';
import { useBulkLoadActions } from './use_load_actions';

export interface UseDataGridColumnsCellActionsProps
  extends Pick<CellActionsProps, 'metadata' | 'disabledActionTypes'> {
  /**
   * Optional trigger ID to used to retrieve the cell actions.
   * returns empty array if not provided
   */
  triggerId?: string;
  /**
   * fields array, used to determine which actions to load.
   * returns empty array if not provided
   */
  fields?: FieldSpec[];
  /**
   * Function to get the cell value for a given field name and row index.
   * the `rowIndex` parameter is absolute, not relative to the current page
   */
  getCellValue: (fieldName: string, rowIndex: number) => CellActionFieldValue;
  /**
   * ref to the EuiDataGrid instance
   */
  dataGridRef?: MutableRefObject<EuiDataGridRefProps | null>;
}
export type UseDataGridColumnsCellActions<
  P extends UseDataGridColumnsCellActionsProps = UseDataGridColumnsCellActionsProps
> = (props: P) => EuiDataGridColumnCellAction[][];

const emptyActions: EuiDataGridColumnCellAction[][] = [];

export const useDataGridColumnsCellActions: UseDataGridColumnsCellActions = ({
  fields,
  getCellValue,
  triggerId,
  metadata,
  dataGridRef,
  disabledActionTypes = [],
}) => {
  const [cellActions, setCellActions] = useState<EuiDataGridColumnCellAction[][]>(emptyActions);

  const bulkContexts: CellActionCompatibilityContext[] | undefined = useMemo(() => {
    if (!triggerId || !fields?.length) {
      return undefined;
    }
    return fields.map((field) => ({
      data: [{ field }],
      trigger: { id: triggerId },
      metadata,
    }));
  }, [fields, triggerId, metadata]);

  const { loading, value: columnsActions } = useBulkLoadActions(bulkContexts, {
    disabledActionTypes,
  });

  useEffect(() => {
    // no-op
    if (loading || !triggerId || !columnsActions?.length || !fields?.length) {
      return;
    }

    // Check for a temporary inconsistency because `useBulkLoadActions` takes one render loop before setting `loading` to true.
    // It will eventually update to a consistent state
    if (columnsActions.length !== fields.length) {
      return;
    }

    setCellActions(
      columnsActions.map((actions, columnIndex) =>
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
      )
    );
  }, [columnsActions, fields, getCellValue, loading, metadata, triggerId, dataGridRef]);

  return cellActions;
};

interface CreateColumnCellActionParams
  extends Pick<UseDataGridColumnsCellActionsProps, 'getCellValue' | 'metadata' | 'dataGridRef'> {
  field: FieldSpec;
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
      const { name } = field;
      const value = getCellValue(name, rowIndex);
      return {
        data: [
          {
            field,
            value,
          },
        ],
        trigger: { id: triggerId },
        nodeRef,
        metadata,
      };
    }, [rowIndex]);

    const onClick = useCallback(async () => {
      actionContext.nodeRef.current = await closeAndGetCellElement({
        dataGrid: dataGridRef?.current,
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
        iconType={action.getIconType(actionContext) ?? ''}
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
  if (element.nodeName === 'DIV' && element.getAttribute('role') === 'gridcell') {
    return element;
  }
  return getParentCellElement(element.parentElement);
};
