/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  useEuiTheme,
} from '@elastic/eui';
import type { CascadeRowPrimitiveProps } from '../types';
import { flexRender, useTableRowAdapter } from '../../../lib/core/table';
import {
  type LeafNode,
  type GroupNode,
  useDataCascadeActions,
  useDataCascadeState,
} from '../../../store_provider';
import { getCascadeRowNodePath, getCascadeRowNodePathValueRecord } from '../../../lib/utils';
import {
  styles as cascadeRowStyles,
  rootRowAttribute,
  childRowAttribute,
} from './cascade_row.styles';
import { CascadeRowActions } from './components/cascade_row_actions';

/**
 * @internal
 * @description Internal component that is used to render a row in the data cascade.
 */
export function CascadeRowPrimitive<G extends GroupNode, L extends LeafNode>({
  isActiveSticky,
  innerRef,
  onCascadeGroupNodeExpanded,
  rowHeaderTitleSlot: RowTitleSlot,
  rowHeaderMetaSlots,
  rowHeaderActions,
  rowInstance,
  size,
  virtualRow,
  virtualRowStyle,
  enableRowSelection,
}: CascadeRowPrimitiveProps<G, L>) {
  const { euiTheme } = useEuiTheme();
  const actions = useDataCascadeActions<G, L>();
  const { currentGroupByColumns } = useDataCascadeState<G, L>();
  const [isPendingRowGroupDataFetch, setRowGroupDataFetch] = useState<boolean>(false);
  const {
    rowIsExpanded,
    hasAllParentsExpanded,
    rowChildren,
    rowDepth,
    rowId,
    rowParentId,
    rowToggleFn,
    rowSelectionFn,
    rowHasSelectedChildren,
    rowIsSelected,
    rowVisibleCells,
    rowCanSelect,
  } = useTableRowAdapter<G>({ rowInstance });

  const isGroupNode = useMemo(() => {
    return currentGroupByColumns.length - 1 > rowDepth;
  }, [currentGroupByColumns.length, rowDepth]);

  const styles = useMemo(() => {
    return cascadeRowStyles(
      euiTheme,
      Boolean(rowParentId && hasAllParentsExpanded),
      rowDepth,
      size
    );
  }, [euiTheme, hasAllParentsExpanded, rowDepth, rowParentId, size]);

  const fetchGroupNodeData = useCallback(() => {
    const dataFetchFn = async () => {
      const groupNodeData = await onCascadeGroupNodeExpanded({
        row: rowInstance,
        nodePath: getCascadeRowNodePath(currentGroupByColumns, rowInstance),
        nodePathMap: getCascadeRowNodePathValueRecord(currentGroupByColumns, rowInstance),
      });

      if (!groupNodeData) {
        return;
      }
      actions.setRowGroupNodeData({
        id: rowId,
        data: groupNodeData,
      });
    };
    return dataFetchFn().catch((error) => {
      // eslint-disable-next-line no-console -- added for debugging purposes
      console.error('Error fetching data for row with ID: %s', rowId, error);
    });
  }, [onCascadeGroupNodeExpanded, rowInstance, currentGroupByColumns, actions, rowId]);

  const fetchCascadeRowGroupNodeData = useCallback(() => {
    setRowGroupDataFetch(true);
    fetchGroupNodeData().finally(() => {
      setRowGroupDataFetch(false);
    });
  }, [fetchGroupNodeData]);

  const onCascadeRowToggle = useCallback(() => {
    rowToggleFn();

    if (isGroupNode) {
      // can expand here denotes it still has some nesting, hence we need to fetch the data for the sub-rows
      fetchCascadeRowGroupNodeData();
    }
  }, [fetchCascadeRowGroupNodeData, isGroupNode, rowToggleFn]);

  const onCascadeRowExpand = useCallback(() => {}, []);

  /**
   * @description required ARIA props to ensure proper accessibility tree gets generated
   * @see https://www.w3.org/WAI/ARIA/apg/patterns/treegrid/
   */
  const rowARIAProps = useMemo(() => {
    return {
      id: rowId,
      role: 'row',
      'aria-expanded': rowIsExpanded,
      'aria-level': rowDepth + 1,
      ...(rowChildren.length > 0 && {
        'aria-owns': rowChildren.map((row) => row.id).join(' '),
      }),
    };
  }, [rowId, rowIsExpanded, rowDepth, rowChildren]);

  return (
    <div
      {...rowARIAProps}
      data-index={virtualRow.index}
      data-row-type={rowDepth === 0 ? rootRowAttribute : childRowAttribute}
      ref={innerRef}
      style={virtualRowStyle}
      {...(isActiveSticky ? { 'data-active-sticky': true } : {})}
      css={styles.rowWrapper}
    >
      <EuiFlexGroup direction="column" gutterSize={size} css={styles.rowInner}>
        <EuiFlexItem>
          <React.Fragment>
            {isPendingRowGroupDataFetch && (
              <EuiProgress
                size="xs"
                color="accent"
                position={rowDepth === 0 ? 'fixed' : 'absolute'}
              />
            )}
          </React.Fragment>
          <EuiFlexGroup
            gutterSize={size}
            direction="row"
            alignItems="center"
            justifyContent="spaceBetween"
          >
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <React.Fragment>
                  {enableRowSelection && rowCanSelect && (
                    <EuiFlexItem>
                      <EuiCheckbox
                        id={`dataCascadeSelectRowCheckbox-${rowId}`}
                        indeterminate={rowHasSelectedChildren}
                        checked={rowIsSelected}
                        onChange={rowSelectionFn}
                      />
                    </EuiFlexItem>
                  )}
                </React.Fragment>
                <EuiFlexItem>
                  <EuiButtonIcon
                    iconType="expand"
                    onClick={onCascadeRowExpand}
                    aria-label={i18n.translate(
                      'sharedUXPackages.dataCascade.expandRowButtonLabel',
                      {
                        defaultMessage: 'expand row',
                      }
                    )}
                    data-test-subj={`expand-row-${rowId}-button`}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiButtonIcon
                    iconType={rowIsExpanded ? 'arrowUp' : 'arrowDown'}
                    onClick={onCascadeRowToggle}
                    aria-label={i18n.translate(
                      'sharedUXPackages.dataCascade.toggleRowButtonLabel',
                      {
                        defaultMessage: 'toggle row',
                      }
                    )}
                    data-test-subj={`toggle-row-${rowId}-button`}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup direction="row">
                <EuiFlexItem grow={6} css={{ justifyContent: 'center' }}>
                  <RowTitleSlot row={rowInstance} />
                </EuiFlexItem>
                <EuiFlexItem grow={4}>
                  <EuiFlexGroup
                    direction="row"
                    gutterSize={size}
                    alignItems="center"
                    justifyContent="flexEnd"
                  >
                    <React.Fragment>
                      {rowHeaderMetaSlots?.({ row: rowInstance }).map((metaSlot, index) => (
                        <EuiFlexItem css={styles.rowHeaderSlotWrapper} key={index} grow>
                          {metaSlot}
                        </EuiFlexItem>
                      ))}
                    </React.Fragment>
                    <React.Fragment>
                      {!!rowHeaderActions?.length && (
                        <EuiFlexItem
                          key="actions"
                          css={[
                            styles.rowHeaderSlotWrapper,
                            {
                              paddingLeft: euiTheme.size[size],
                            },
                          ]}
                          grow={false}
                        >
                          <CascadeRowActions<G>
                            rowHeaderActions={rowHeaderActions}
                            rowInstance={rowInstance}
                          />
                        </EuiFlexItem>
                      )}
                    </React.Fragment>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <React.Fragment>
          {!isGroupNode && rowIsExpanded && hasAllParentsExpanded && (
            <EuiFlexItem role="gridcell">
              {rowVisibleCells.map((cell) => (
                <React.Fragment key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </React.Fragment>
              ))}
            </EuiFlexItem>
          )}
        </React.Fragment>
      </EuiFlexGroup>
    </div>
  );
}
