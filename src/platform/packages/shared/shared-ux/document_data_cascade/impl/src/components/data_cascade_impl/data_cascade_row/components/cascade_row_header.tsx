/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import React, { useCallback, useState, useEffect, useMemo } from 'react';
import {
  EuiButtonIcon,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  useEuiTheme,
} from '@elastic/eui';
import { getCascadeRowNodePath, getCascadeRowNodePathValueRecord } from '../../../../lib/utils';
import { useAdaptedTableRows } from '../../../../lib/core/table';
import {
  type GroupNode,
  type LeafNode,
  useDataCascadeActions,
  useDataCascadeState,
} from '../../../../store_provider';
import type { CascadeRowHeaderPrimitiveProps } from '../../types';
import { CascadeRowActions } from './cascade_row_actions';
import { styles as cascadeRowHeaderStyles } from './cascade_row_header.styles';

/**
 * @internal
 */
export function CascadeRowHeaderPrimitive<G extends GroupNode, L extends LeafNode>({
  rowInstance,
  rowHeaderTitleSlot: RowTitleSlot,
  rowHeaderMetaSlots,
  rowHeaderActions,
  size,
  enableRowSelection,
  enableSecondaryExpansionAction,
  isGroupNode,
  onCascadeGroupNodeExpanded,
}: CascadeRowHeaderPrimitiveProps<G, L>) {
  const { euiTheme } = useEuiTheme();
  const actions = useDataCascadeActions<G, L>();
  const { currentGroupByColumns } = useDataCascadeState<G, L>();
  const [isPendingRowGroupDataFetch, setRowGroupDataFetch] = useState<boolean>(false);

  const styles = useMemo(() => cascadeRowHeaderStyles(euiTheme, size), [euiTheme, size]);

  const {
    rowIsExpanded,
    rowDepth,
    rowId,
    rowChildrenCount,
    rowToggleFn,
    rowSelectionFn,
    rowHasSelectedChildren,
    isRowSelected,
    rowCanSelect,
  } = useAdaptedTableRows<G, L>({ rowInstance });

  const nodePath = useMemo(
    () => getCascadeRowNodePath(currentGroupByColumns, rowInstance),
    [currentGroupByColumns, rowInstance]
  );

  const headerMetaSlots = useMemo(
    () => rowHeaderMetaSlots?.({ rowData: rowInstance.original, nodePath }),
    [rowHeaderMetaSlots, rowInstance, nodePath]
  );

  const headerActions = useMemo(
    () => rowHeaderActions?.({ rowData: rowInstance.original, nodePath }),
    [rowHeaderActions, rowInstance, nodePath]
  );

  const fetchGroupNodeData = useCallback(() => {
    const dataFetchFn = async () => {
      const groupNodeData = await onCascadeGroupNodeExpanded({
        row: rowInstance.original,
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

  const onCascadeSecondaryExpansion = useCallback(() => {}, []);

  useEffect(() => {
    // fetch the data for the sub-rows
    if (isGroupNode && rowIsExpanded && !Boolean(rowChildrenCount)) {
      setRowGroupDataFetch(true);
      fetchGroupNodeData().finally(() => {
        setRowGroupDataFetch(false);
      });
    }
  }, [rowIsExpanded, rowChildrenCount, isGroupNode, fetchGroupNodeData]);

  return (
    <React.Fragment>
      <React.Fragment>
        {isPendingRowGroupDataFetch && (
          <EuiProgress size="xs" color="accent" position={rowDepth === 0 ? 'fixed' : 'absolute'} />
        )}
      </React.Fragment>
      <EuiFlexGroup
        gutterSize={size}
        direction="row"
        alignItems="center"
        justifyContent="spaceBetween"
        css={{ minWidth: 0, maxWidth: '100%' }}
      >
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <React.Fragment>
              {enableRowSelection && rowCanSelect() && (
                <EuiFlexItem grow={false}>
                  <EuiCheckbox
                    id={`dataCascadeSelectRowCheckbox-${rowId}`}
                    indeterminate={rowHasSelectedChildren()}
                    checked={isRowSelected()}
                    onChange={rowSelectionFn}
                  />
                </EuiFlexItem>
              )}
            </React.Fragment>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                color="text"
                iconType={rowIsExpanded ? 'arrowDown' : 'arrowRight'}
                onClick={rowToggleFn}
                aria-label={i18n.translate('sharedUXPackages.dataCascade.toggleRowButtonLabel', {
                  defaultMessage: 'toggle row',
                })}
                data-test-subj={`toggle-row-${rowId}-button`}
              />
            </EuiFlexItem>
            <React.Fragment>
              {enableSecondaryExpansionAction && (
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    color="text"
                    iconType="expand"
                    onClick={onCascadeSecondaryExpansion}
                    aria-label={i18n.translate(
                      'sharedUXPackages.dataCascade.expandRowButtonLabel',
                      {
                        defaultMessage: 'expand row',
                      }
                    )}
                    data-test-subj={`expand-row-${rowId}-button`}
                  />
                </EuiFlexItem>
              )}
            </React.Fragment>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem css={{ minWidth: 0, maxWidth: '100%' }}>
          <EuiFlexGroup justifyContent="spaceBetween" direction="row">
            <EuiFlexItem grow={4} css={styles.rowHeaderTitleWrapper}>
              <RowTitleSlot rowData={rowInstance.original} nodePath={nodePath} />
            </EuiFlexItem>
            <EuiFlexItem
              grow={6}
              css={styles.rowHeaderSlotContainer}
              style={{
                maxWidth: `${Math.min(10 + Math.max(headerMetaSlots?.length ?? 0, 1) * 20, 60)}%`,
              }}
            >
              <EuiFlexGroup
                direction="row"
                gutterSize={size}
                alignItems="center"
                justifyContent="flexEnd"
                css={styles.rowHeaderSlotContainerInner}
              >
                <React.Fragment>
                  {headerMetaSlots?.map((metaSlot, index) => (
                    <EuiFlexItem css={styles.rowHeaderSlotItemWrapper} key={index}>
                      {metaSlot}
                    </EuiFlexItem>
                  ))}
                </React.Fragment>
                <React.Fragment>
                  {Boolean(headerActions?.length) && (
                    <EuiFlexItem
                      key="actions"
                      css={[
                        styles.rowHeaderSlotItemWrapper,
                        {
                          paddingLeft: euiTheme.size[size],
                        },
                      ]}
                    >
                      <CascadeRowActions headerRowActions={headerActions!} />
                    </EuiFlexItem>
                  )}
                </React.Fragment>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </React.Fragment>
  );
}
