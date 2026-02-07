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
import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import type { Observable } from 'rxjs';
import type { SerializedDrilldowns, DrilldownState } from '../../server';

export type DrilldownActionState = DrilldownState & { actionId: string };

export type DrilldownDefinition<
  TDrilldownState extends DrilldownState = DrilldownState,
  TContext extends object = object
> = {
  /**
   * Implements the "navigation" action of the drilldown. This happens when
   * user interacts with something in the UI that executes the drilldown trigger.
   *
   * @param drilldownState Drilldown state.
   * @param context Object that represents context in which the drilldown is being executed in.
   */
  execute(drilldownState: TDrilldownState, context: TContext): Promise<void>;

  /**
   * Name of EUI icon to display when showing this drilldown to user.
   */
  euiIcon?: string;

  getInitialLabel(): string;

  getInitialState(): Partial<Omit<TDrilldownState, 'label' | 'trigger' | 'type'>>;

  /**
   * Returns a link where drilldown should navigate on middle click or Ctrl + click.
   */
  getHref?(drilldownState: TDrilldownState, context: TContext): Promise<string | undefined>;

  isCompatible?: ActionDefinition['isCompatible'];

  isStateValid(state: Partial<Omit<TDrilldownState, 'label' | 'trigger' | 'type'>>): boolean;

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
};

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
