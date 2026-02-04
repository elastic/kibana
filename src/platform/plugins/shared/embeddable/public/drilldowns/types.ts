/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LicenseType } from '@kbn/licensing-types';
import type {
  EmbeddableApiContext,
  PublishingSubject,
  StateComparators,
} from '@kbn/presentation-publishing';
import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import type { Observable } from 'rxjs';
import type { DrilldownsState, DrilldownState } from '../../server';

export type DrilldownStateInternal = DrilldownState & { actionId: string };

export type DrilldownDefinition<TDrilldownState extends DrilldownState = DrilldownState> = {
  /**
   * Implements the "navigation" action of the drilldown. This happens when
   * user interacts with something in the UI that executes the drilldown trigger.
   *
   * @param config Drilldown state.
   * @param context Object that represents context in which the drilldown is being executed in.
   */
  execute(drilldownState: TDrilldownState, context: EmbeddableApiContext): Promise<void>;

  /**
   * Name of EUI icon to display when showing this drilldown to user.
   */
  euiIcon?: string;

  /**
   * Returns a link where drilldown should navigate on middle click or Ctrl + click.
   */
  getHref?(
    drilldownState: TDrilldownState,
    context: EmbeddableApiContext
  ): Promise<string | undefined>;

  isCompatible?: ActionDefinition['isCompatible'];

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
  comparators: StateComparators<DrilldownsState>;
  anyStateChange$: Observable<void>;
  getLatestState: () => DrilldownsState;
  reinitializeState: (lastState: DrilldownsState) => void;
}

export type HasDrilldowns = {
  setDrilldowns: (drilldowns: DrilldownState[]) => void;
  drilldowns$: PublishingSubject<DrilldownState[]>;
};
