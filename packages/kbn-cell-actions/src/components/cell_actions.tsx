/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useRef } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { InlineActions } from './inline_actions';
import { HoverActionsPopover } from './hover_actions_popover';
import { CellActionsMode } from '../constants';
import type { CellActionsProps, CellActionExecutionContext } from '../types';

export const CellActions: React.FC<CellActionsProps> = ({
  field,
  triggerId,
  children,
  mode,
  showActionTooltips = true,
  visibleCellActions = 3,
  disabledActionTypes = [],
  metadata,
  className,
}) => {
  const nodeRef = useRef<HTMLDivElement | null>(null);

  const actionContext: CellActionExecutionContext = useMemo(
    () => ({
      field,
      trigger: { id: triggerId },
      nodeRef,
      metadata,
    }),
    [field, triggerId, metadata]
  );

  const dataTestSubj = `cellActions-renderContent-${field.name}`;
  if (mode === CellActionsMode.HOVER) {
    return (
      <div className={className} ref={nodeRef} data-test-subj={dataTestSubj}>
        <HoverActionsPopover
          actionContext={actionContext}
          showActionTooltips={showActionTooltips}
          visibleCellActions={visibleCellActions}
          disabledActionTypes={disabledActionTypes}
        >
          {children}
        </HoverActionsPopover>
      </div>
    );
  }

  return (
    <EuiFlexGroup
      responsive={false}
      alignItems="center"
      ref={nodeRef}
      gutterSize="none"
      justifyContent="flexStart"
      className={className}
      data-test-subj={dataTestSubj}
    >
      <EuiFlexItem grow={false}>{children}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <InlineActions
          actionContext={actionContext}
          showActionTooltips={showActionTooltips}
          visibleCellActions={visibleCellActions}
          disabledActionTypes={disabledActionTypes}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
