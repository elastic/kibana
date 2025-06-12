/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, type EuiButtonIconProps } from '@elastic/eui';
import { ActionItem } from './cell_action_item';
import { usePartitionActions } from '../hooks/actions';
import { ExtraActionsPopOver } from './extra_actions_popover';
import { ExtraActionsButton } from './extra_actions_button';
import type { CellActionExecutionContext } from '../types';
import { useLoadActions } from '../hooks/use_load_actions';

interface InlineActionsProps {
  actionContext: CellActionExecutionContext;
  anchorPosition: 'rightCenter' | 'downCenter';
  showActionTooltips: boolean;
  visibleCellActions: number;
  disabledActionTypes: string[];
  extraActionsIconType?: EuiButtonIconProps['iconType'];
  extraActionsColor?: EuiButtonIconProps['color'];
}

export const InlineActions: React.FC<InlineActionsProps> = ({
  actionContext,
  anchorPosition,
  showActionTooltips,
  visibleCellActions,
  disabledActionTypes,
  extraActionsIconType,
  extraActionsColor,
}) => {
  const { value: actions } = useLoadActions(actionContext, { disabledActionTypes });
  const { extraActions, visibleActions } = usePartitionActions(actions ?? [], visibleCellActions);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const togglePopOver = useCallback(() => setIsPopoverOpen((isOpen) => !isOpen), []);
  const closePopOver = useCallback(() => setIsPopoverOpen(false), []);
  const button = useMemo(
    () => (
      <ExtraActionsButton
        onClick={togglePopOver}
        showTooltip={showActionTooltips}
        extraActionsIconType={extraActionsIconType}
        extraActionsColor={extraActionsColor}
      />
    ),
    [togglePopOver, showActionTooltips, extraActionsIconType, extraActionsColor]
  );

  return (
    <EuiFlexGroup
      responsive={false}
      alignItems="flexStart"
      gutterSize="none"
      data-test-subj="inlineActions"
      className={`inlineActions ${isPopoverOpen ? 'inlineActions-popoverOpen' : ''}`}
    >
      {visibleActions.map((action) => (
        <EuiFlexItem grow={false} key={`action-item-${action.id}`}>
          <ActionItem
            action={action}
            actionContext={actionContext}
            showTooltip={showActionTooltips}
          />
        </EuiFlexItem>
      ))}
      {extraActions.length > 0 ? (
        <EuiFlexItem grow={false}>
          <ExtraActionsPopOver
            actions={extraActions}
            actionContext={actionContext}
            anchorPosition={anchorPosition}
            button={button}
            closePopOver={closePopOver}
            isOpen={isPopoverOpen}
            extraActionsColor={extraActionsColor}
          />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};
