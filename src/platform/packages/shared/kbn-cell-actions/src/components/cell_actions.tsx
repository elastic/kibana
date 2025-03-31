/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useRef } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { isArray } from 'lodash/fp';
import { InlineActions } from './inline_actions';
import { HoverActionsPopover } from './hover_actions_popover';
import { CellActionsMode } from '../constants';
import type { CellActionsProps, CellActionExecutionContext } from '../types';

export const CellActions: React.FC<CellActionsProps> = ({
  data,
  triggerId,
  children,
  mode,
  showActionTooltips = true,
  visibleCellActions = 3,
  disabledActionTypes = [],
  metadata,
  className,
  extraActionsIconType,
  extraActionsColor,
}) => {
  const nodeRef = useRef<HTMLDivElement | null>(null);

  const dataArray = useMemo(() => (isArray(data) ? data : [data]), [data]);

  const actionContext: CellActionExecutionContext = useMemo(
    () => ({
      data: dataArray,
      trigger: { id: triggerId },
      nodeRef,
      metadata,
    }),
    [dataArray, triggerId, metadata]
  );

  const anchorPosition = useMemo(
    () => (mode === CellActionsMode.HOVER_DOWN ? 'downCenter' : 'rightCenter'),
    [mode]
  );

  const dataTestSubj = `cellActions-renderContent-${dataArray
    .map(({ field }) => field.name)
    .join('-')}`;

  if (mode === CellActionsMode.HOVER_DOWN || mode === CellActionsMode.HOVER_RIGHT) {
    return (
      <div className={className} ref={nodeRef} data-test-subj={dataTestSubj}>
        <HoverActionsPopover
          anchorPosition={anchorPosition}
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
          anchorPosition={anchorPosition}
          actionContext={actionContext}
          showActionTooltips={showActionTooltips}
          visibleCellActions={visibleCellActions}
          disabledActionTypes={disabledActionTypes}
          extraActionsIconType={extraActionsIconType}
          extraActionsColor={extraActionsColor}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
