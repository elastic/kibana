/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LicenseType } from '@kbn/licensing-types';
import type { PublishingSubject, StateComparators } from '@kbn/presentation-publishing';
import type { Observable } from 'rxjs';
import type { FC } from 'react';
import type { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import type { SerializedDrilldowns, DrilldownState } from '../../server';

export type DrilldownActionState = DrilldownState & { actionId: string };

export type DrilldownDefinition<
  TDrilldownState extends DrilldownState = DrilldownState,
  // Drilldown action execution context, i.e. context from on_filter trigger
  ExecutionContext extends object = object,
  // Drilldown setup context, i.e. context from open_context_menu trigger
  SetupContext extends object = object
> = {
  /**
   * Drilldown type display name. i.e. "Go to dashboard"
   * Should be i18n string
   */
  displayName: string;

  /**
   * Name of EUI icon to display when showing this drilldown to user.
   */
  euiIcon?: string;

  license?: {
    /**
     * Minimal license level
     * Empty means no restrictions
     */
    minimalLicense: LicenseType;

    /**
     * Is a user-facing string. Has to be unique. Doesn't need i18n.
     * The feature's name will be displayed to Cloud end-users when they're billed based on their feature usage.
     */
    featureName: string;
  };

  /**
   * List of triggers supported by drilldown type
   * Used to narrow trigger selection when configuring drilldown
   */
  supportedTriggers: string[];

  /**
   * Used during drilldown setup (create/edit drilldown configuration).
   */
  setup: {
    /**
     * Drilldown editor component. Rendered as child of EuiForm component.
     */
    readonly Editor: FC<DrilldownEditorProps<TDrilldownState, SetupContext>>;

    getInitialState(): Partial<Omit<TDrilldownState, 'trigger' | 'type'>>;

    /**
     * Compatibility check during drilldown setup
     */
    isCompatible?(context: SetupContext): boolean;

    isStateValid(state: Partial<Omit<TDrilldownState, 'label' | 'trigger' | 'type'>>): boolean;

    /**
     * Determines the display order of the drilldowns in the flyout picker.
     * Higher numbers are displayed first.
     */
    order?: number;
  };

  /**
   * During embeddable setup, an action is registered for the drilldown configuration.
   * Used during drilldown action execution.
   */
  action: {
    /**
     * Implements the "navigation" action of the drilldown. This happens when
     * user interacts with something in the UI that executes the drilldown trigger.
     *
     * @param drilldownState Drilldown state.
     * @param executionContext Object that represents context in which the drilldown is being executed in.
     */
    execute(drilldownState: TDrilldownState, context: ExecutionContext): Promise<void>;

    /**
     * Returns a link where drilldown should navigate on middle click or Ctrl + click.
     */
    getHref?(
      drilldownState: TDrilldownState,
      context: ExecutionContext
    ): Promise<string | undefined>;

    /**
     * Compatibility check during drilldown execution
     */
    isCompatible?: (drilldownState: TDrilldownState, context: ExecutionContext) => Promise<boolean>;

    MenuItem?: FC<{
      drilldownState: TDrilldownState;
      context: ActionExecutionContext<ExecutionContext>;
    }>;
  };
};

export type DrilldownRegistryEntry = [string, () => Promise<DrilldownDefinition>];

/**
 * Props provided to `Editor` component on every re-render.
 */
export interface DrilldownEditorProps<
  TDrilldownState extends DrilldownState = DrilldownState,
  SetupContext extends object = object
> {
  /**
   * Current (latest) state.
   */
  state: Partial<TDrilldownState>;

  /**
   * Callback called when user updates the state in UI.
   */
  onChange: (state: Partial<TDrilldownState>) => void;

  /**
   * Context information about where component is being rendered.
   */
  context: SetupContext;
}

export interface DrilldownsManager {
  api: HasDrilldowns;
  cleanup: () => void;
  comparators: StateComparators<SerializedDrilldowns>;
  anyStateChange$: Observable<void>;
  getLatestState: () => SerializedDrilldowns;
  reinitializeState: (lastState: SerializedDrilldowns) => void;
}

export type HasDrilldowns = {
  setDrilldowns: (drilldowns: DrilldownState[]) => void;
  drilldowns$: PublishingSubject<DrilldownActionState[]>;
};
