/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  Action,
  ActionExecutionContext,
  UiActionsService,
} from '@kbn/ui-actions-plugin/public';

export interface CellActionsProviderProps {
  /**
   * Please assign `uiActions.getTriggerCompatibleActions` function.
   * This function should return a list of actions for a triggerId that are compatible with the provided context.
   */
  getTriggerCompatibleActions: UiActionsService['getTriggerCompatibleActions'];
}

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
  value: string | string[] | null | undefined;
}

export enum CellActionsMode {
  HOVER = 'hover',
  INLINE = 'inline',
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
   * UI configuration. Possible options are `HOVER` and `INLINE`.
   *
   * `HOVER` shows the actions when the children component is hovered.
   *
   * `INLINE` always shows the actions.
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

export interface CellActionExecutionContext extends ActionExecutionContext {
  field: CellActionField;
  /**
   * Ref to a DOM node where the action can add custom HTML.
   */
  extraContentNodeRef: React.MutableRefObject<HTMLDivElement | null>;

  /**
   * Ref to the node where the cell action are rendered.
   */
  nodeRef: React.MutableRefObject<HTMLElement | null>;

  /**
   * Extra configurations for actions.
   */
  metadata?: Record<string, unknown>;
}

export interface CellActionCompatibilityContext extends ActionExecutionContext {
  /**
   * The object containing the field name and type, needed for the compatibility check
   */
  field: Pick<CellActionField, 'name' | 'type'>;
  /**
   * Extra configurations for actions.
   */
  metadata?: Record<string, unknown>;
}

export interface CellAction<C extends CellActionExecutionContext = CellActionExecutionContext>
  extends Omit<Action<C>, 'isCompatible'> {
  /**
   * Returns a promise that resolves to true if this action is compatible given the context,
   * otherwise resolves to false.
   */
  isCompatible(context: CellActionCompatibilityContext): Promise<boolean>;
}

export type GetActions = (context: CellActionCompatibilityContext) => Promise<CellAction[]>;

export interface PartitionedActions {
  extraActions: CellAction[];
  visibleActions: CellAction[];
}
