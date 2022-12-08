/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { orderBy } from 'lodash/fp';
import React, { useCallback, useContext, useMemo, useRef } from 'react';
import type { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';

import { CellActionsContext } from './cell_actions_context';
import { InlineActions } from './inline_actions';
import { HoverActionsPopover } from './hover_actions_popover';

export interface CellActionConfig {
  field: string;
  fieldType: string;
  value: string;
  metadata?: Record<string, unknown>;
}

export interface CellActionExecutionContext extends CellActionConfig, ActionExecutionContext {
  /**
   * Ref to a DOM node where the action can add custom HTML.
   */
  extraContentNodeRef: React.MutableRefObject<HTMLDivElement | null>;

  /**
   * Ref to the node where the cell action are rendered.
   */
  nodeRef: React.MutableRefObject<HTMLDivElement | null>;
}

export enum CellActionsMode {
  HOVER_POPOVER = 'hover-popover',
  ALWAYS_VISIBLE = 'always-visible',
}

export interface CellActionsProps {
  config: CellActionConfig;
  triggerId: string;
  mode: CellActionsMode;
  showTooltip?: boolean;
  showMoreActionsFrom?: number;
  /**
   * Extra data that can is sent directly to actions.
   * Every action can require a different set of properties to render.
   */
  metadata?: Record<string, unknown>;
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
  metadata,
}) => {
  const context = useContext(CellActionsContext);
  const extraContentNodeRef = useRef<HTMLDivElement | null>(null);
  const nodeRef = useRef<HTMLDivElement | null>(null);

  const actionContext: CellActionExecutionContext = useMemo(
    () => ({ ...config, trigger: { id: triggerId }, extraContentNodeRef, nodeRef, metadata }),
    [config, triggerId, metadata]
  );

  const getActions = useCallback(() => {
    if (!context.getCompatibleActions) {
      // eslint-disable-next-line no-console
      console.error(
        'No CellActionsContext found. Please wrap the application with CellActionsContextProvider'
      );
      return Promise.resolve([]);
    } else {
      return context
        .getCompatibleActions(triggerId, actionContext)
        .then((actions) => orderBy(['order', 'id'], ['asc', 'asc'], actions));
    }
  }, [context, triggerId, actionContext]);

  if (mode === CellActionsMode.HOVER_POPOVER) {
    return (
      <div ref={nodeRef}>
        <HoverActionsPopover
          getActions={getActions}
          actionContext={actionContext}
          showTooltip={showTooltip}
          showMoreActionsFrom={showMoreActionsFrom}
        >
          {children}
        </HoverActionsPopover>

        <div ref={extraContentNodeRef} />
      </div>
    );
  } else if (mode === CellActionsMode.ALWAYS_VISIBLE) {
    return (
      <div ref={nodeRef}>
        {children}
        <InlineActions
          getActions={getActions}
          actionContext={actionContext}
          showTooltip={showTooltip}
          showMoreActionsFrom={showMoreActionsFrom}
        />
        <div ref={extraContentNodeRef} />
      </div>
    );
  } else {
    return <>Not implemented</>;
  }
};

CellActions.displayName = 'CellActions';
