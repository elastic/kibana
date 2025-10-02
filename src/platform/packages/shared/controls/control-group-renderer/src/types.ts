/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';

import type { ControlsRendererParentApi } from '@kbn/controls-renderer/src/types';
import type { StickyControlState } from '@kbn/controls-schemas';
import type { DataControlState, TimeSlice } from '@kbn/controls-schemas/src/types';
import type { StoredControlGroupInput } from '@kbn/dashboard-plugin/server/dashboard_saved_object';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { PublishesESQLVariables } from '@kbn/esql-types';
import type { AppliesFilters, PublishingSubject } from '@kbn/presentation-publishing';

import type { controlGroupStateBuilder } from './control_group_state_builder';

export type ControlGroupRendererApi = ControlsRendererParentApi &
  Pick<AppliesFilters, 'appliedFilters$'> &
  PublishesESQLVariables & {
    reload: () => void;

    /**
     * @deprecated
     * Calling `updateInput` will cause the entire control group to be re-initialized.
     *
     * Therefore, to update state without `updateInput`, you should add public setters to the
     * relavant API (`ControlGroupApi` or the individual control type APIs) for the state you wish to update
     * and call those setters instead.
     */
    updateInput: (input: Partial<ControlGroupRuntimeState>) => void;

    /**
     * @deprecated
     * Instead of subscribing to the whole runtime state, it is more efficient to subscribe to the individual
     * publishing subjects of the control group API.
     */
    getInput$: () => Observable<ControlGroupRuntimeState>;

    /**
     * @deprecated
     */
    getInput: () => ControlGroupRuntimeState;

    timeslice$: PublishingSubject<TimeSlice | undefined>;
  };

/**
 * ----------------------------------------------------------------
 * Control group state
 * ----------------------------------------------------------------
 */

/**
 *
 */
export type ControlStateTransform<State extends DataControlState = DataControlState> = (
  newState: Partial<State>,
  controlType: string
) => Partial<State>;

export type FieldFilterPredicate = (f: DataViewField) => boolean;
export interface ControlGroupEditorConfig<State extends DataControlState = DataControlState> {
  hideDataViewSelector?: boolean;
  hideAdditionalSettings?: boolean;
  fieldFilterPredicate?: FieldFilterPredicate;
  controlStateTransform?: ControlStateTransform<State>;
}

export interface ControlGroupRuntimeState<State extends StickyControlState = StickyControlState> {
  initialChildControlState: ControlPanelsState<State>;
  ignoreParentSettings?: StoredControlGroupInput['ignoreParentSettings']; // these will be translated to panel-level settings
}

export interface ControlGroupCreationOptions {
  initialState?: Partial<ControlGroupRuntimeState>;
  editorConfig?: ControlGroupEditorConfig;
}

export type ControlGroupStateBuilder = typeof controlGroupStateBuilder;

/**
 * ----------------------------------------------------------------
 * Control group panel state
 * ----------------------------------------------------------------
 */

export interface ControlPanelsState<State extends StickyControlState = StickyControlState> {
  [panelId: string]: ControlPanelState<State>;
}

export type ControlPanelState<ControlState extends StickyControlState = StickyControlState> =
  ControlState & {
    type: string;
    order: number;
  };
