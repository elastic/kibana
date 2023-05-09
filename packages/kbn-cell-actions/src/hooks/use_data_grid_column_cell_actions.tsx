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
} from '../types';
import { useBulkLoadActions } from './use_load_actions';

interface BulkField extends Pick<CellActionField, 'name' | 'type'> {
  /**
   * Array containing all the values of the field in the visible page, indexed by rowIndex
   */
  values: Array<string | string[] | null | undefined>;
}

export interface UseDataGridColumnsCellActionsProps
  extends Pick<CellActionsProps, 'triggerId' | 'metadata' | 'disabledActionTypes'> {
  fields?: BulkField[];
  dataGridRef: MutableRefObject<EuiDataGridRefProps | null>;
}
export type UseDataGridColumnsCellActions<
  P extends UseDataGridColumnsCellActionsProps = UseDataGridColumnsCellActionsProps
> = (props: P) => EuiDataGridColumnCellAction[][];

export const useDataGridColumnsCellActions: UseDataGridColumnsCellActions = ({
  fields,
  triggerId,
  metadata,
  dataGridRef,
  disabledActionTypes = [],
}) => {
  const bulkContexts: CellActionCompatibilityContext[] = useMemo(
    () =>
      fields?.map(({ values, ...field }) => ({
        field, // we are getting the actions for the whole column field, so the compatibility check will be done without the value
        trigger: { id: triggerId },
        metadata,
      })) ?? [],
    [fields, triggerId, metadata]
  );

  const { loading, value: columnsActions } = useBulkLoadActions(bulkContexts, {
    disabledActionTypes,
  });

  const columnsCellActions = useMemo<EuiDataGridColumnCellAction[][]>(() => {
    if (loading) {
      return (
        fields?.map(() => [
          () => <EuiLoadingSpinner size="s" data-test-subj="dataGridColumnCellAction-loading" />,
        ]) ?? []
      );
    }
    if (!columnsActions || !fields || fields.length === 0) {
      return [];
    }
    return columnsActions.map((actions, columnIndex) =>
      actions.map((action) =>
        createColumnCellAction({
          action,
          metadata,
          triggerId,
          field: fields[columnIndex],
          dataGridRef,
        })
      )
    );
  }, [columnsActions, fields, loading, metadata, triggerId, dataGridRef]);

  return columnsCellActions;
};

interface CreateColumnCellActionParams
  extends Pick<UseDataGridColumnsCellActionsProps, 'triggerId' | 'metadata' | 'dataGridRef'> {
  field: BulkField;
  action: CellAction;
}
const createColumnCellAction = ({
  field,
  action,
  metadata,
  triggerId,
  dataGridRef,
}: CreateColumnCellActionParams): EuiDataGridColumnCellAction =>
  function ColumnCellAction({ Component, rowIndex, isExpanded }) {
    const nodeRef = useRef<HTMLAnchorElement | null>(null);
    const buttonRef = useRef<HTMLAnchorElement | null>(null);

    const actionContext: CellActionExecutionContext = useMemo(() => {
      const { name, type, values } = field;
      // rowIndex refers to all pages, we need to use the row index relative to the page to get the value
      const value = values[rowIndex % values.length];
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
