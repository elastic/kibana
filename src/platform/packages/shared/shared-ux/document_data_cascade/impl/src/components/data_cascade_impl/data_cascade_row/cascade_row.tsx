/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  useEuiTheme,
  type EuiThemeShape,
} from '@elastic/eui';
import { flexRender, type Row } from '@tanstack/react-table';
import type { VirtualItem } from '@tanstack/react-virtual';
import { type GroupNode } from '../../data_cascade_provider';

export interface CascadeRowProps<G> {
  isActiveSticky: boolean;
  innerRef: React.LegacyRef<HTMLDivElement>;
  populateGroupNodeDataFn: (args: { row: Row<G> }) => Promise<void>;
  rowHeaderTitleSlot: React.FC<{ row: Row<G> }>;
  rowHeaderMetaSlots?: (props: { row: Row<G> }) => React.ReactNode[];
  rowInstance: Row<G>;
  /**
   * The size of the component, can be 's' (small), 'm' (medium), or 'l' (large).
   */
  size: keyof Pick<EuiThemeShape['size'], 's' | 'm' | 'l'>;
  virtualRow: VirtualItem;
  virtualRowStyle: React.CSSProperties;
}

export function CascadeRow<G extends GroupNode>({
  isActiveSticky,
  innerRef,
  populateGroupNodeDataFn,
  rowHeaderTitleSlot: RowTitleSlot,
  rowHeaderMetaSlots,
  rowInstance,
  size,
  virtualRow,
  virtualRowStyle,
}: CascadeRowProps<G>) {
  const { euiTheme } = useEuiTheme();
  const [isPendingRowGroupDataFetch, setRowGroupDataFetch] = React.useState<boolean>(false);

  // rows that can be expanded are denoted to be group nodes
  const isGroupNode = rowInstance.getCanExpand();

  const fetchCascadeRowGroupNodeData = React.useCallback(() => {
    setRowGroupDataFetch(true);
    populateGroupNodeDataFn({ row: rowInstance }).finally(() => {
      setRowGroupDataFetch(false);
    });
  }, [populateGroupNodeDataFn, rowInstance]);

  const onCascadeRowClick = React.useCallback(
    (_isGroupNode: boolean) => {
      rowInstance.toggleExpanded();
      if (_isGroupNode) {
        // can expand here denotes it still has some nesting, hence we need to fetch the data for the sub-rows
        fetchCascadeRowGroupNodeData();
      }
    },
    [fetchCascadeRowGroupNodeData, rowInstance]
  );

  /**
   * @description required ARIA props to ensure proper accessibility tree gets generated
   * @see https://www.w3.org/WAI/ARIA/apg/patterns/treegrid/
   */
  const rowARIAProps = React.useMemo(() => {
    return {
      id: rowInstance.id,
      role: 'row',
      'aria-expanded': rowInstance.getIsExpanded(),
      'aria-level': rowInstance.depth + 1,
      ...(rowInstance.subRows.length > 0 && {
        'aria-owns': rowInstance.subRows.map((row) => row.id).join(' '),
      }),
    };
  }, [rowInstance]);

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
        borderLeft: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
        borderRight: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
        '&[data-row-type="sub-group"]': {
          paddingTop: 0,
          paddingBottom: 0,
        },
        '&[data-row-type="root"]:not([data-active-sticky])': {
          borderTop: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
        },
        '&[data-row-type="root"]:first-of-type:not([data-active-sticky])': {
          borderTopLeftRadius: euiTheme.border.radius.small,
          borderTopRightRadius: euiTheme.border.radius.small,
        },
        '&[data-row-type="root"]:last-of-type:not([data-active-sticky])': {
          borderBottomLeftRadius: euiTheme.border.radius.small,
          borderBottomRightRadius: euiTheme.border.radius.small,
        },
        '&[data-row-type="root"]:last-of-type': {
          borderBottom: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
        },
      }}
    >
      <EuiFlexGroup
        direction="column"
        gutterSize={size}
        css={{
          position: 'relative',
          ...(rowInstance.parentId && rowInstance.getIsAllParentsExpanded()
            ? {
                padding: `${euiTheme.size[size]} calc(${euiTheme.size[size]} * ${
                  rowInstance.depth + 1
                })`,
                borderLeft: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
                borderRight: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
                borderTop: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
                ...(rowInstance.depth % 2 === 1
                  ? { backgroundColor: euiTheme.colors.backgroundBaseSubdued }
                  : {}),
              }
            : {}),
          '[data-row-type="root"] + [data-row-type="sub-group"] &': {
            borderTopLeftRadius: euiTheme.border.radius.small,
            borderTopRightRadius: euiTheme.border.radius.small,
          },
          '[data-row-type="sub-group"]:has(+ [data-row-type="root"]) &': {
            marginBottom: euiTheme.size[size],
            borderBottomLeftRadius: euiTheme.border.radius.small,
            borderBottomRightRadius: euiTheme.border.radius.small,
            borderBottom: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
          },
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
                iconType={rowInstance.getIsExpanded() ? 'arrowDown' : 'arrowRight'}
                onClick={onCascadeRowClick.bind(null, isGroupNode)}
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
          {!isGroupNode && rowInstance.getIsExpanded() && rowInstance.getIsAllParentsExpanded() && (
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
