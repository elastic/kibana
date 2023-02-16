/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ActionItem } from './cell_action_item';
import { usePartitionActions } from '../hooks/actions';
import { ExtraActionsPopOver } from './extra_actions_popover';
import { ExtraActionsButton } from './extra_actions_button';
import { CellActionExecutionContext } from '../types';
import { useLoadActions } from '../hooks/use_load_actions';

interface InlineActionsProps {
  actionContext: CellActionExecutionContext;
  showActionTooltips: boolean;
  visibleCellActions: number;
  disabledActionTypes: string[];
}

export const InlineActions: React.FC<InlineActionsProps> = ({
  actionContext,
  showActionTooltips,
  visibleCellActions,
  disabledActionTypes,
}) => {
  const { value: actions } = useLoadActions(actionContext, { disabledActionTypes });
  const { extraActions, visibleActions } = usePartitionActions(actions ?? [], visibleCellActions);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const togglePopOver = useCallback(() => setIsPopoverOpen((isOpen) => !isOpen), []);
  const closePopOver = useCallback(() => setIsPopoverOpen(false), []);
  const button = useMemo(
    () => <ExtraActionsButton onClick={togglePopOver} showTooltip={showActionTooltips} />,
    [togglePopOver, showActionTooltips]
  );

  return (
    <EuiFlexGroup
      responsive={false}
      alignItems="flexStart"
      gutterSize="none"
      data-test-subj="inlineActions"
      className={`inlineActions ${isPopoverOpen ? 'inlineActions-popoverOpen' : ''}`}
    >
      {visibleActions.map((action, index) => (
        <EuiFlexItem grow={false}>
          <ActionItem
            key={`action-item-${index}`}
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
            button={button}
            closePopOver={closePopOver}
            isOpen={isPopoverOpen}
          />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};
