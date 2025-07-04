/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PropsWithChildren } from 'react';
import type {
  Action,
  ActionExecutionContext,
  UiActionsService,
} from '@kbn/ui-actions-plugin/public';
import type { FieldSpec } from '@kbn/data-views-plugin/common';
import type { Serializable } from '@kbn/utility-types';
import type { EuiButtonIconProps } from '@elastic/eui';
import type { CellActionsMode } from './constants';

export * from './actions/types';

export type CellActionsProviderProps = PropsWithChildren<{
  /**
   * Please assign `uiActions.getTriggerCompatibleActions` function.
   * This function should return a list of actions for a triggerId that are compatible with the provided context.
   */
  getTriggerCompatibleActions: UiActionsService['getTriggerCompatibleActions'];
}>;

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

export type CellActionsProps = PropsWithChildren<{
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
  /**
   * The class name for the cell actions.
   */
  className?: string;
  /**
   * The icon type for the extra actions button.
   */
  extraActionsIconType?: EuiButtonIconProps['iconType'];
  /**
   * The color for the extra actions button.
   */
  extraActionsColor?: EuiButtonIconProps['color'];
}>;

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
