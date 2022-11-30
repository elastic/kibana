/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { orderBy } from 'lodash/fp';
import React, { useCallback, useContext, useMemo } from 'react';

import { CellActionsContext } from './cell_actions_context';
import { HoverActions } from './hover_actions';
import { InlineActions } from './inline_actions';

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
  showMoreActionsFrom?: number;
}

export const CellActions: React.FC<CellActionsProps> = ({
  config,
  triggerId,
  children,
  mode,
  showTooltip = true,
  /**
   * It shows 'more actions' button when the number of actions is bigger than this parameter.
   */
  showMoreActionsFrom = 3,
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
        showMoreActionsFrom={showMoreActionsFrom}
      >
        {children}
      </HoverActions>
    );
  } else if (mode === CellActionsMode.INLINE) {
    return (
      <>
        {children}
        <InlineActions
          config={config}
          getActions={getActions}
          actionContext={actionContext}
          showTooltip={showTooltip}
          showMoreActionsFrom={showMoreActionsFrom}
        />
      </>
    );
  } else {
    return <>Not implemented</>;
  }
};

CellActions.displayName = 'CellActions';
