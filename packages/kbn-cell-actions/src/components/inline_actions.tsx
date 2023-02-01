/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useMemo, useState } from 'react';
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
}

export const InlineActions: React.FC<InlineActionsProps> = ({
  actionContext,
  showActionTooltips,
  visibleCellActions,
}) => {
  const { value: allActions } = useLoadActions(actionContext);
  const { extraActions, visibleActions } = usePartitionActions(
    allActions ?? [],
    visibleCellActions
  );
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const togglePopOver = useCallback(() => setIsPopoverOpen((isOpen) => !isOpen), []);
  const closePopOver = useCallback(() => setIsPopoverOpen(false), []);
  const button = useMemo(
    () => <ExtraActionsButton onClick={togglePopOver} showTooltip={showActionTooltips} />,
    [togglePopOver, showActionTooltips]
  );

  return (
    <span data-test-subj="inlineActions">
      {visibleActions.map((action, index) => (
        <ActionItem
          key={`action-item-${index}`}
          action={action}
          actionContext={actionContext}
          showTooltip={showActionTooltips}
        />
      ))}
      {extraActions.length > 0 ? (
        <ExtraActionsPopOver
          actions={extraActions}
          actionContext={actionContext}
          button={button}
          closePopOver={closePopOver}
          isOpen={isPopoverOpen}
        />
      ) : null}
    </span>
  );
};
