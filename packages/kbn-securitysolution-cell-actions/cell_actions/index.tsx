/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { orderBy } from 'lodash/fp';
import React, { useCallback, useContext, useMemo } from 'react';

import type { Action, ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { CellActionsContext } from './cell_actions_context';
import { HoverActions } from './hover_actions';
import { ActionItem } from './cell_action_item';

// TODO Define an shared interface for all actions configuration
export interface CellActionConfig {
  field: string;
  fieldType: string;
  value: string;
}

export enum CellActionsMode {
  HOVER_POPUP = 'hover-popup',
  HOVER_INLINE = 'hover-inline',
  INLINE = 'inline',
}

export interface CellActionsProps {
  config: CellActionConfig;
  triggerId: string;
  mode: CellActionsMode;
  showTooltip?: boolean;
}

export const CellActions: React.FC<CellActionsProps> = ({
  config,
  triggerId,
  children,
  mode,
  showTooltip = true,
}) => {
  const context = useContext(CellActionsContext);

  const getActions = useCallback(() => {
    if (!context.getCompatibleActions) {
      // eslint-disable-next-line no-console
      console.error(
        'No CellActionsContext found. Please wrap the application with CellActionsContextProvider'
      );
      return [];
    } else {
      return orderBy(
        ['order', 'title'],
        ['desc', 'asc'],
        context.getCompatibleActions(triggerId, config)
      );
    }
  }, [config, triggerId, context]);

  const actionContext = useMemo(
    () => ({ ...config, trigger: { id: triggerId } }),
    [config, triggerId]
  );

  if (mode === CellActionsMode.HOVER_POPUP) {
    return (
      <HoverActions
        config={config}
        getActions={getActions}
        actionContext={actionContext}
        showTooltip={showTooltip}
      >
        {children}
      </HoverActions>
    );
  } else {
    return (
      <>
        {children}
        <InlineActions
          getActions={getActions}
          actionContext={actionContext}
          showTooltip={showTooltip}
        />
      </>
    );
  }
};

interface InlineActionsProps {
  getActions: () => Action[];
  actionContext: ActionExecutionContext;
  showTooltip: boolean;
}

const InlineActions: React.FC<InlineActionsProps> = ({
  getActions,
  actionContext,
  showTooltip,
}) => {
  const actions = useMemo(() => getActions(), [getActions]);

  return (
    <>
      {actions.map((action) => (
        <ActionItem action={action} actionContext={actionContext} showTooltip={showTooltip} />
      ))}
    </>
  );
};
