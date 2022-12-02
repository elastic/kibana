/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { Action, ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { ActionItem } from './cell_action_item';
import { usePartitionActions } from '../hooks/actions';
import { ExtraActionsPopOver } from './extra_actions_popover';
import { ExtraActionsButton } from './extra_actions_button';
import { CellActionConfig } from '.';

interface InlineActionsProps {
  config: CellActionConfig;
  getActions: () => Promise<Action[]>;
  actionContext: ActionExecutionContext;
  showTooltip: boolean;
  showMoreActionsFrom: number;
}

export const InlineActions: React.FC<InlineActionsProps> = ({
  getActions,
  actionContext,
  showTooltip,
  showMoreActionsFrom,
  config,
}) => {
  const { extraActions, visibleActions } = usePartitionActions(getActions, showMoreActionsFrom);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const togglePopOver = useCallback(() => setIsPopoverOpen((isOpen) => !isOpen), []);
  const closePopOver = useCallback(() => setIsPopoverOpen(false), []);
  const popOverAnchorRef = useRef<HTMLElement>(null);
  const button = useMemo(
    () => <ExtraActionsButton onClick={togglePopOver} showTooltip={showTooltip} />,
    [togglePopOver, showTooltip]
  );

  return (
    <span>
      {visibleActions.map((action) => (
        <ActionItem action={action} actionContext={actionContext} showTooltip={showTooltip} />
      ))}
      {extraActions.length > 0 ? (
        <ExtraActionsPopOver
          actions={extraActions}
          anchorRef={popOverAnchorRef}
          actionContext={actionContext}
          config={config}
          button={button}
          closePopOver={closePopOver}
          isOpen={isPopoverOpen}
        />
      ) : null}
    </span>
  );
};

InlineActions.displayName = 'InlineActions';
