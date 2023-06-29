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
import type { FieldSpec } from '@kbn/data-views-plugin/common';
import { Serializable } from '@kbn/utility-types';
import type { CellActionsMode } from './constants';

export interface CellActionsProviderProps {
  /**
   * Please assign `uiActions.getTriggerCompatibleActions` function.
   * This function should return a list of actions for a triggerId that are compatible with the provided context.
   */
  getTriggerCompatibleActions: UiActionsService['getTriggerCompatibleActions'];
}

type Metadata = Record<string, unknown>;

export type CellActionFieldValue =
  | Serializable
  // Add primitive array types to allow type guards to work.
  // Because SerializableArray is a cyclic self referenced Array.
  | string[]
  | number[]
  | boolean[]
  | null[]
  | undefined[];

export interface CellActionsData {
  /**
   * The field specification
   */
  field: FieldSpec;

  /**
   * Common set of properties used by most actions.
   */
  value: CellActionFieldValue;
}

export interface CellActionsProps {
  data: CellActionsData | CellActionsData[];

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
   * List of Actions ids that shouldn't be displayed inside cell actions.
   */
  disabledActionTypes?: string[];
  /**
   * Custom set of properties used by some actions.
   * An action might require a specific set of metadata properties to render.
   * This data is sent directly to actions.
   */
  metadata?: Metadata;

  className?: string;
}

export interface CellActionExecutionContext extends ActionExecutionContext {
  data: CellActionsData[];

  /**
   * Ref to the node where the cell action are rendered.
   */
  nodeRef: React.MutableRefObject<HTMLElement | null>;
  /**
   * Extra configurations for actions.
   */
  metadata: Metadata | undefined;
}

/**
 * Subset of `CellActionExecutionContext` used only for the compatibility check in the `isCompatible` function.
 * It omits the references and the `field.value`.
 */

export interface CellActionCompatibilityContext<
  C extends CellActionExecutionContext = CellActionExecutionContext
> extends ActionExecutionContext {
  /**
   * CellActionsData containing the field spec but not the value for the compatibility check
   */
  data: Array<Omit<C['data'][number], 'value'>>;

  /**
   * Extra configurations for actions.
   */
  metadata: C['metadata'] | undefined;
}

export interface CellAction<C extends CellActionExecutionContext = CellActionExecutionContext>
  extends Omit<Action<C>, 'isCompatible'> {
  /**
   * Returns a promise that resolves to true if this action is compatible given the context,
   * otherwise resolves to false.
   */
  isCompatible(context: CellActionCompatibilityContext<C>): Promise<boolean>;
}

export type GetActions = (context: CellActionCompatibilityContext) => Promise<CellAction[]>;

export interface PartitionedActions {
  extraActions: CellAction[];
  visibleActions: CellAction[];
}

/**
 * Cell action factory template with optional `id`.
 * The id override is required when using the action factory so it
 * can be omitted in the original action creator
 */
export type CellActionTemplate<C extends CellAction = CellAction> = Omit<C, 'id'>;
/**
 * Action factory extend parameter type,
 */
export type CellActionExtend<C extends CellAction = CellAction> = Partial<C> & { id: string };
export interface CellActionFactory<C extends CellAction = CellAction> {
  <A extends C = C>(extend: CellActionExtend<A>): A;
  combine: <A extends C = C>(
    partialActionTemplate: Partial<CellActionTemplate<A>>
  ) => CellActionFactory<A>;
}
