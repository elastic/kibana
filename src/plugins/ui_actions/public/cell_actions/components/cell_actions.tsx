/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useRef } from 'react';
import type { ActionExecutionContext } from '../../actions';
import { InlineActions } from './inline_actions';
import { HoverActionsPopover } from './hover_actions_popover';

export interface CellActionField {
  /**
   * Field name.
   * Example: 'host.name'
   */
  name: string;
  /**
   * Field type.
   * Example: 'keyword'
   */
  type: string;
  /**
   * Field value.
   * Example: 'My-Laptop'
   */
  value: string;
}

export interface CellActionExecutionContext extends ActionExecutionContext {
  /**
   * Ref to a DOM node where the action can add custom HTML.
   */
  extraContentNodeRef: React.MutableRefObject<HTMLDivElement | null>;

  /**
   * Ref to the node where the cell action are rendered.
   */
  nodeRef: React.MutableRefObject<HTMLDivElement | null>;

  /**
   * Extra configurations for actions.
   */
  metadata?: Record<string, unknown>;

  field: CellActionField;
}

export enum CellActionsMode {
  HOVER_POPOVER = 'hover-popover',
  ALWAYS_VISIBLE = 'always-visible',
}

export interface CellActionsProps {
  /**
   * Common set of properties used by most actions.
   */
  field: CellActionField;
  /**
   * The trigger in which the actions are registered.
   */
  triggerId: string;
  /**
   * UI configuration. Possible options are `HOVER_POPOVER` and `ALWAYS_VISIBLE`.
   *
   * `HOVER_POPOVER` shows the actions when the children component is hovered.
   *
   * `ALWAYS_VISIBLE` always shows the actions.
   */
  mode: CellActionsMode;

  /**
   * It displays a tooltip for every action button when `true`.
   */
  showActionTooltips?: boolean;
  /**
   * It shows 'more actions' button when the number of actions is bigger than this parameter.
   */
  visibleCellActions?: number;
  /**
   * Custom set of properties used by some actions.
   * An action might require a specific set of metadata properties to render.
   * This data is sent directly to actions.
   */
  metadata?: Record<string, unknown>;
}

export const CellActions: React.FC<CellActionsProps> = ({
  field,
  triggerId,
  children,
  mode,
  showActionTooltips = true,
  visibleCellActions = 3,
  metadata,
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

  if (mode === CellActionsMode.HOVER_POPOVER) {
    return (
      <div ref={nodeRef} data-test-subj={'cellActions'}>
        <HoverActionsPopover
          actionContext={actionContext}
          showActionTooltips={showActionTooltips}
          visibleCellActions={visibleCellActions}
        >
          {children}
        </HoverActionsPopover>

        <div ref={extraContentNodeRef} />
      </div>
    );
  }

  return (
    <div ref={nodeRef} data-test-subj={'cellActions'}>
      {children}
      <InlineActions
        actionContext={actionContext}
        showActionTooltips={showActionTooltips}
        visibleCellActions={visibleCellActions}
      />
      <div ref={extraContentNodeRef} />
    </div>
  );
};
