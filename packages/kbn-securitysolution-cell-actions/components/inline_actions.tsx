/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useMemo } from 'react';
import type { Action, ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { ActionItem } from './cell_action_item';
import { usePartitionActions } from '../hooks/actions';
import { ExtraActionsPopOver } from './extra_actions_popover';

interface InlineActionsProps {
  getActions: () => Action[];
  actionContext: ActionExecutionContext;
  showTooltip: boolean;
  showMoreActionsFrom: number;
}

export const InlineActions: React.FC<InlineActionsProps> = ({
  getActions,
  actionContext,
  showTooltip,
  showMoreActionsFrom,
}) => {
  const allActions = useMemo(() => getActions(), [getActions]);

  const { extraActions, visibleActions } = usePartitionActions(allActions, showMoreActionsFrom);
  const getPartitionedActions = useCallback(
    () => ({ extraActions, visibleActions }),
    [extraActions, visibleActions]
  );

  return (
    <>
      {visibleActions.map((action) => (
        <ActionItem action={action} actionContext={actionContext} showTooltip={showTooltip} />
      ))}
      <ExtraActionsPopOver
        getPartitionedActions={getPartitionedActions}
        showMoreActionsFrom={showMoreActionsFrom}
        anchorRef={contentRef}
        actionContext={actionContext}
        config={config}
        closePopOver={closeExtraActions}
        isOpen={isExtraActionsPopoverOpen}
      />
    </>
  );
};
