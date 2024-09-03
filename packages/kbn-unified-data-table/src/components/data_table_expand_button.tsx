/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext, useEffect, useRef, useState } from 'react';
import { EuiButtonIcon, EuiDataGridCellValueElementProps, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { UnifiedDataTableContext } from '../table_context';
import { DataTableRowControl, Size } from './data_table_row_control';
import { useControlColumn } from '../hooks/use_control_column';

/**
 * Button to expand a given row
 */
export const ExpandButton = (props: EuiDataGridCellValueElementProps) => {
  const { record, rowIndex } = useControlColumn(props);

  const toolTipRef = useRef<EuiToolTip>(null);
  const [pressed, setPressed] = useState<boolean>(false);
  const { expanded, setExpanded, componentsTourSteps } = useContext(UnifiedDataTableContext);

  const tourStep = componentsTourSteps ? componentsTourSteps.expandButton : undefined;

  const isCurrentRowExpanded = record === expanded;
  const buttonLabel = i18n.translate('unifiedDataTable.grid.viewDoc', {
    defaultMessage: 'Toggle dialog with details',
  });

  const testSubj = record.isAnchor
    ? 'docTableExpandToggleColumnAnchor'
    : 'docTableExpandToggleColumn';

  useEffect(() => {
    if (!isCurrentRowExpanded && pressed) {
      setPressed(false);
      setTimeout(() => {
        toolTipRef.current?.hideToolTip();
      }, 100);
    }
  }, [isCurrentRowExpanded, setPressed, pressed]);

  if (!setExpanded) {
    return null;
  }

  return (
    <DataTableRowControl size={Size.normal}>
      <EuiToolTip content={buttonLabel} delay="long" ref={toolTipRef}>
        <EuiButtonIcon
          id={rowIndex === 0 ? tourStep : undefined}
          size="xs"
          iconSize="s"
          aria-label={buttonLabel}
          data-test-subj={testSubj}
          onClick={() => {
            const nextHit = isCurrentRowExpanded ? undefined : record;
            toolTipRef.current?.hideToolTip();
            setPressed(Boolean(nextHit));
            setExpanded?.(nextHit);
          }}
          color={isCurrentRowExpanded ? 'primary' : 'text'}
          iconType={isCurrentRowExpanded ? 'minimize' : 'expand'}
          isSelected={isCurrentRowExpanded}
        />
      </EuiToolTip>
    </DataTableRowControl>
  );
};
