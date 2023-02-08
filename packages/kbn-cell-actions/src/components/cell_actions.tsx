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
import { CellActionsMode, type CellActionsProps, type CellActionExecutionContext } from '../types';

export const CellActions: React.FC<CellActionsProps> = ({
  field,
  triggerId,
  children,
  mode,
  showActionTooltips = true,
  visibleCellActions = 3,
  disabledActions = [],
  metadata,
  className,
}) => {
  const extraContentNodeRef = useRef<HTMLDivElement | null>(null);
  const nodeRef = useRef<HTMLDivElement | null>(null);

  const actionContext: CellActionExecutionContext = useMemo(
    () => ({
      field,
      trigger: { id: triggerId },
      extraContentNodeRef,
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
          disabledActions={disabledActions}
        >
          {children}
        </HoverActionsPopover>

        <div ref={extraContentNodeRef} />
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
    >
      <EuiFlexItem grow={false}>{children}</EuiFlexItem>
      <EuiFlexItem grow={false} className={className} data-test-subj={dataTestSubj}>
        <InlineActions
          actionContext={actionContext}
          showActionTooltips={showActionTooltips}
          visibleCellActions={visibleCellActions}
          disabledActions={disabledActions}
        />
        <div ref={extraContentNodeRef} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
