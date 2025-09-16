/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import {
  type GroupNode,
  useDataCascadeActions,
  useDataCascadeState,
} from '../../../store_provider';
import type { CascadeHeaderPrimitiveProps } from '../types';
import { SelectionDropdown } from './group_selection_combobox';
import { styles as cascadeHeaderStyles } from './cascade_header.styles';

export function CascadeHeaderPrimitive<G extends GroupNode>({
  customTableHeader,
  tableTitleSlot: TableTitleSlot,
  tableRows,
  onCascadeGroupingChange,
}: CascadeHeaderPrimitiveProps<G>) {
  const { euiTheme } = useEuiTheme();
  const { groupByColumns, currentGroupByColumns } = useDataCascadeState();
  const actions = useDataCascadeActions();

  const persistGroupByColumnSelection = useCallback(
    (groupByColumn: string[]) => {
      actions.setActiveCascadeGroups(groupByColumn);
      onCascadeGroupingChange?.(groupByColumn);
    },
    [actions, onCascadeGroupingChange]
  );

  const styles = useMemo(() => cascadeHeaderStyles(euiTheme), [euiTheme]);

  const renderProps = {
    currentSelectedColumns: currentGroupByColumns,
    availableColumns: groupByColumns,
    onSelectionChange: persistGroupByColumnSelection,
  };

  return customTableHeader ? (
    <div css={styles.cascadeHeaderWrapper}>{customTableHeader(renderProps)}</div>
  ) : (
    <EuiFlexGroup
      justifyContent="spaceBetween"
      alignItems="center"
      css={styles.cascadeHeaderWrapper}
    >
      <EuiFlexItem id="treegrid-label">
        <TableTitleSlot rows={tableRows} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <SelectionDropdown {...renderProps} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
