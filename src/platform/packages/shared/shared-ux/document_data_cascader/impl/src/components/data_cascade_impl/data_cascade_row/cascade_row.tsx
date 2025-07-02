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
  type EuiThemeShape,
  useEuiTheme,
} from '@elastic/eui';
import { flexRender, type Row } from '@tanstack/react-table';
import type { VirtualItem } from '@tanstack/react-virtual';
import { type GroupNode } from '../../data_cascade_provider';

export interface CascadeRowProps<T> {
  innerRef: React.LegacyRef<HTMLLIElement>;
  isActiveSticky: boolean;
  populateGroupNodeDataFn: (args: { row: Row<T> }) => Promise<void>;
  rowInstance: Row<T>;
  /**
   * The size of the component, can be 's' (small), 'm' (medium), or 'l' (large). Default is 'm'.
   */
  rowGapSize: keyof Pick<EuiThemeShape['size'], 's' | 'm' | 'l'>;
  virtualRow: VirtualItem;
  virtualRowStyle: React.CSSProperties;
}

export function CascadeRow<G extends GroupNode>({
  innerRef,
  isActiveSticky,
  populateGroupNodeDataFn,
  rowInstance,
  virtualRow,
  virtualRowStyle,
}: CascadeRowProps<G>) {
  const { euiTheme } = useEuiTheme();
  const [isPendingRowGroupDataFetch, setRowGroupDataFetch] = React.useState<boolean>(false);

  const fetchCascadeRowGroupNodeData = React.useCallback(() => {
    setRowGroupDataFetch(true);
    populateGroupNodeDataFn({ row: rowInstance }).finally(() => {
      setRowGroupDataFetch(false);
    });
  }, [populateGroupNodeDataFn, rowInstance]);

  const onCascadeRowClick = React.useCallback(
    (isGroupNode: boolean) => {
      rowInstance.toggleExpanded();
      if (isGroupNode) {
        // can expand here denotes it still has some nesting, hence we need to fetch the data for the sub-rows
        fetchCascadeRowGroupNodeData();
      }
    },
    [fetchCascadeRowGroupNodeData, rowInstance]
  );

  return (
    <li
      key={rowInstance.id}
      data-index={virtualRow.index}
      data-row-type={rowInstance.depth === 0 ? 'root' : 'sub-group'}
      ref={innerRef}
      style={virtualRowStyle}
      css={{
        display: 'flex',
        position: 'absolute',
        zIndex: isActiveSticky ? euiTheme.levels.header : 'unset',
        willChange: isActiveSticky ? 'transform, top' : 'unset',
        width: '100%',
        padding: euiTheme.size.s,
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
        borderLeft: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
        borderRight: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
        ...(!rowInstance.parentId
          ? {
              borderTop: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
            }
          : {
              paddingTop: 0,
              paddingBottom: 0,
            }),
        '&[data-row-type="root"]:first-of-type': {
          borderTopLeftRadius: euiTheme.border.radius.small,
          borderTopRightRadius: euiTheme.border.radius.small,
        },
        '&[data-row-type="root"]:last-of-type': {
          borderBottom: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
          borderBottomLeftRadius: euiTheme.border.radius.small,
          borderBottomRightRadius: euiTheme.border.radius.small,
        },
      }}
    >
      <EuiFlexGroup
        direction="row"
        gutterSize="s"
        alignItems="flexStart"
        justifyContent="spaceBetween"
        css={{
          position: 'relative',
          ...(rowInstance.parentId && rowInstance.getIsAllParentsExpanded()
            ? {
                padding: `${euiTheme.base / 2}px ${
                  (euiTheme.base / 2) * (rowInstance.depth + 1)
                }px`,
                borderLeft: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
                borderRight: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
                borderTop: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
                backgroundColor: euiTheme.colors.backgroundBasePlain,
              }
            : {}),
          '[data-row-type="root"] + [data-row-type="sub-group"] &': {
            borderTopLeftRadius: euiTheme.border.radius.small,
            borderTopRightRadius: euiTheme.border.radius.small,
          },
          '[data-row-type="sub-group"]:has(+ [data-row-type="root"]) &': {
            marginBottom: euiTheme.size.s,
            borderBottomLeftRadius: euiTheme.border.radius.small,
            borderBottomRightRadius: euiTheme.border.radius.small,
            borderBottom: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
          },
        }}
      >
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType={rowInstance.getIsExpanded() ? 'arrowDown' : 'arrowRight'}
            onClick={onCascadeRowClick.bind(null, rowInstance.getCanExpand())}
            aria-label={i18n.translate('sharedUXPackages.dataCascade.removeRowButtonLabel', {
              defaultMessage: 'expand row',
            })}
            data-test-subj={`expand-row-${rowInstance.id}-button`}
          />
        </EuiFlexItem>
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
          <React.Fragment>
            {rowInstance.getVisibleCells().map((cell) => {
              return (
                <React.Fragment key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </React.Fragment>
              );
            })}
          </React.Fragment>
        </EuiFlexItem>
      </EuiFlexGroup>
    </li>
  );
}
