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
    rowIsSelected,
    rowCanSelect,
  } = useAdaptedTableRows<G, L>({ rowInstance });

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
            <React.Fragment>
              {enableSecondaryExpansionAction && (
                <EuiFlexItem>
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
            <EuiFlexItem>
              <EuiButtonIcon
                color="text"
                iconType={rowIsExpanded ? 'arrowUp' : 'arrowDown'}
                onClick={rowToggleFn}
                aria-label={i18n.translate('sharedUXPackages.dataCascade.toggleRowButtonLabel', {
                  defaultMessage: 'toggle row',
                })}
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
    </React.Fragment>
  );
}
