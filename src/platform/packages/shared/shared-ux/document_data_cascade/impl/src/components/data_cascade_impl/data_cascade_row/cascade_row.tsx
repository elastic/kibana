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
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiProgress, useEuiTheme } from '@elastic/eui';
import { flexRender, type Row } from '@tanstack/react-table';
import type { VirtualItem } from '@tanstack/react-virtual';
import { type CascadeRowCellPrimitiveProps } from './cascade_row_cell';
import {
  type LeafNode,
  type GroupNode,
  useDataCascadeDispatch,
  useDataCascadeState,
} from '../../data_cascade_provider';
import { getCascadeRowNodePath, getCascadeRowNodePathValueRecord } from './utils';

interface OnCascadeGroupNodeExpandedArgs<G extends GroupNode> {
  row: Row<G>;
  /**
   * @description The path of the row that was expanded in the group by hierarchy.
   */
  nodePath: string[];
  /**
   * @description KV record of the path values for the row node.
   */
  nodePathMap: Record<string, string>;
}

/**
 * @internal
 * @description Internal cascade row primitive component props.
 */
export interface CascadeRowPrimitiveProps<G extends GroupNode, L extends LeafNode> {
  isActiveSticky: boolean;
  innerRef: React.LegacyRef<HTMLDivElement>;
  /**
   * @description Callback function that is called when a cascade node is expanded.
   */
  onCascadeGroupNodeExpanded: (args: OnCascadeGroupNodeExpandedArgs<G>) => Promise<G[]>;
  /**
   * @description The row instance for the cascade row.
   */
  rowInstance: Row<G>;
  /**
   * @description The row header title slot for the cascade row.
   */
  rowHeaderTitleSlot: React.FC<{ row: Row<G> }>;
  /**
   * @description The row header meta slots for the cascade row.
   */
  rowHeaderMetaSlots?: (props: { row: Row<G> }) => React.ReactNode[];
  /**
   * @description The size of the row component, can be 's' (small), 'm' (medium), or 'l' (large).
   */
  size: CascadeRowCellPrimitiveProps<G, L>['size'];
  /**
   * @description The virtual row for the cascade row.
   */
  virtualRow: VirtualItem;
  /**
   * @description The virtual row style for the cascade row.
   */
  virtualRowStyle: React.CSSProperties;
}

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
  rowInstance,
  size,
  virtualRow,
  virtualRowStyle,
}: CascadeRowPrimitiveProps<G, L>) {
  const { euiTheme } = useEuiTheme();
  const dispatch = useDataCascadeDispatch<G, L>();
  const { currentGroupByColumns } = useDataCascadeState<G, L>();
  const [isPendingRowGroupDataFetch, setRowGroupDataFetch] = useState<boolean>(false);

  // rows that can be expanded are denoted to be group nodes
  const isGroupNode = rowInstance.getCanExpand();
  const isRowExpanded = rowInstance.getIsExpanded();
  const hasAllParentsExpanded = rowInstance.getIsAllParentsExpanded();

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
      dispatch({
        type: 'UPDATE_ROW_GROUP_NODE_DATA',
        payload: {
          id: rowInstance.id,
          data: groupNodeData,
        },
      });
    };
    return dataFetchFn().catch((error) => {
      // eslint-disable-next-line no-console -- added for debugging purposes
      console.error('Error fetching data for row with ID: %s', rowInstance.id, error);
    });
  }, [dispatch, onCascadeGroupNodeExpanded, rowInstance, currentGroupByColumns]);

  const fetchCascadeRowGroupNodeData = useCallback(() => {
    setRowGroupDataFetch(true);
    fetchGroupNodeData().finally(() => {
      setRowGroupDataFetch(false);
    });
  }, [fetchGroupNodeData]);

  const onCascadeRowClick = useCallback(() => {
    rowInstance.toggleExpanded();
    if (isGroupNode) {
      // can expand here denotes it still has some nesting, hence we need to fetch the data for the sub-rows
      fetchCascadeRowGroupNodeData();
    }
  }, [fetchCascadeRowGroupNodeData, isGroupNode, rowInstance]);

  /**
   * @description required ARIA props to ensure proper accessibility tree gets generated
   * @see https://www.w3.org/WAI/ARIA/apg/patterns/treegrid/
   */
  const rowARIAProps = useMemo(() => {
    return {
      id: rowInstance.id,
      role: 'row',
      'aria-expanded': isRowExpanded,
      'aria-level': rowInstance.depth + 1,
      ...(rowInstance.subRows.length > 0 && {
        'aria-owns': rowInstance.subRows.map((row) => row.id).join(' '),
      }),
    };
  }, [rowInstance, isRowExpanded]);

  return (
    <div
      {...rowARIAProps}
      data-index={virtualRow.index}
      data-row-type={rowInstance.depth === 0 ? 'root' : 'sub-group'}
      ref={innerRef}
      style={virtualRowStyle}
      {...(isActiveSticky ? { 'data-active-sticky': true } : {})}
      css={{
        display: 'flex',
        position: 'absolute',
        width: '100%',
        padding: euiTheme.size[size],
        backgroundColor: euiTheme.colors.backgroundBasePlain,
        '&[data-row-type="sub-group"]': {
          paddingTop: 0,
          paddingBottom: 0,
        },
        '&:before': {
          content: '""',
          display: 'block',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: -1,
          borderLeft: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
          borderRight: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
        },
        '&[data-row-type="root"]:not([data-active-sticky]):before': {
          borderTop: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
        },
        '&[data-row-type="root"]:first-of-type:not([data-active-sticky]):before': {
          borderTopLeftRadius: euiTheme.border.radius.small,
          borderTopRightRadius: euiTheme.border.radius.small,
        },
        '&[data-row-type="root"]:last-of-type:not([data-active-sticky]):before': {
          borderBottomLeftRadius: euiTheme.border.radius.small,
          borderBottomRightRadius: euiTheme.border.radius.small,
        },
        '&[data-row-type="root"]:last-of-type:before': {
          borderBottom: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
        },
      }}
    >
      <EuiFlexGroup
        direction="column"
        gutterSize={size}
        css={{
          position: 'relative',
          ...(rowInstance.parentId && hasAllParentsExpanded
            ? {
                padding: euiTheme.size[size],
                ...(rowInstance.depth % 2 === 1
                  ? {
                      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
                    }
                  : {
                      paddingTop: 0,
                      paddingBottom: 0,
                    }),

                '&:before': {
                  content: '""',
                  display: 'block',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  borderTop: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
                  borderLeft: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
                  borderRight: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
                },

                '[data-row-type="root"] + [data-row-type="sub-group"] &:before': {
                  borderTopLeftRadius: euiTheme.border.radius.small,
                  borderTopRightRadius: euiTheme.border.radius.small,
                },

                '[data-row-type="sub-group"]:has(+ [data-row-type="root"]) &': {
                  marginBottom: euiTheme.size[size],
                },

                '[data-row-type="sub-group"]:has(+ [data-row-type="root"]) &:before': {
                  borderBottomLeftRadius: euiTheme.border.radius.small,
                  borderBottomRightRadius: euiTheme.border.radius.small,
                  borderBottom: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
                },

                '[data-row-type="sub-group"][aria-level="3"] &': {
                  gap: 0,
                },

                '[data-row-type="sub-group"][aria-level="3"] & > *': {
                  padding: euiTheme.size[size],
                  backgroundColor: euiTheme.colors.backgroundBasePlain,
                },

                '[data-row-type="sub-group"][aria-level="3"] &:before': {
                  backgroundColor: euiTheme.colors.backgroundBaseSubdued,
                  zIndex: -1,
                  borderTop: 0,
                },

                '[data-row-type="sub-group"][aria-level="3"] &:after': {
                  content: '""',
                  display: 'block',
                  position: 'absolute',
                  top: 0,
                  left: euiTheme.size[size],
                  width: `calc(100% - ${euiTheme.size[size]} * 2)`,
                  height: '100%',
                  pointerEvents: 'none',
                  borderTop: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
                  borderLeft: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
                  borderRight: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
                },

                '[data-row-type="sub-group"]:not([aria-level="3"]) + [data-row-type="sub-group"][aria-level="3"]  &:after':
                  {
                    borderTopLeftRadius: euiTheme.border.radius.small,
                    borderTopRightRadius: euiTheme.border.radius.small,
                  },

                '[data-row-type="sub-group"][aria-level="3"]:has(+ [data-row-type="root"]:not([aria-level="3"]), + [data-row-type="sub-group"]:not([aria-level="3"])) & > *:last-child':
                  {
                    marginBottom: euiTheme.size[size],
                  },

                '[data-row-type="sub-group"][aria-level="3"]:has(+ [data-row-type="root"]:not([aria-level="3"]), + [data-row-type="sub-group"]:not([aria-level="3"])) &:after':
                  {
                    height: `calc(100% - ${euiTheme.size[size]})`,
                    borderBottomLeftRadius: euiTheme.border.radius.small,
                    borderBottomRightRadius: euiTheme.border.radius.small,
                    borderBottom: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
                  },
              }
            : {}),
        }}
      >
        <EuiFlexItem>
          <React.Fragment>
            {isPendingRowGroupDataFetch && (
              <EuiProgress
                size="xs"
                color="accent"
                position={rowInstance.depth === 0 ? 'fixed' : 'absolute'}
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
              <EuiButtonIcon
                iconType={isRowExpanded ? 'arrowDown' : 'arrowRight'}
                onClick={onCascadeRowClick}
                aria-label={i18n.translate('sharedUXPackages.dataCascade.removeRowButtonLabel', {
                  defaultMessage: 'expand row',
                })}
                data-test-subj={`expand-row-${rowInstance.id}-button`}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup direction="row">
                <EuiFlexItem grow={4} css={{ justifyContent: 'center' }}>
                  <RowTitleSlot row={rowInstance} />
                </EuiFlexItem>
                <EuiFlexItem grow={6}>
                  <EuiFlexGroup
                    direction="row"
                    gutterSize={size}
                    alignItems="center"
                    justifyContent="flexEnd"
                  >
                    {rowHeaderMetaSlots?.({ row: rowInstance }).map((metaSlot, index) => (
                      <EuiFlexItem grow={false} key={index}>
                        {metaSlot}
                      </EuiFlexItem>
                    ))}
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <React.Fragment>
          {!isGroupNode && isRowExpanded && hasAllParentsExpanded && (
            <EuiFlexItem
              role="gridcell"
              css={{
                padding: `0 calc(${euiTheme.size[size]} * ${rowInstance.depth})`,
              }}
            >
              {rowInstance.getVisibleCells().map((cell) => (
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
