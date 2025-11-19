/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';

import type { ControlsRendererParentApi } from '@kbn/controls-renderer';
import type {
  DataControlState,
  LegacyIgnoreParentSettings,
  StickyControlState,
} from '@kbn/controls-schemas';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { PublishesESQLVariables } from '@kbn/esql-types';
import type { AppliesFilters, AppliesTimeslice } from '@kbn/presentation-publishing';

import type { controlGroupStateBuilder } from './control_group_state_builder';

export type ControlGroupRendererApi = ControlsRendererParentApi &
  Pick<AppliesFilters, 'appliedFilters$'> &
  PublishesESQLVariables &
  AppliesTimeslice & {
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

    openAddDataControlFlyout: (options?: {
      controlStateTransform?: ControlStateTransform;
      editorConfig?: ControlGroupEditorConfig;
    }) => void;
  };

/**
 * ----------------------------------------------------------------
 * Data control editor customization
 * ----------------------------------------------------------------
 */

/**
 * The editor config allows the consumer to hide different parts of the data control editor
 */
interface HasEditorConfig {
  getEditorConfig: () => ControlGroupEditorConfig | undefined;
}

export const apiHasEditorConfig = (parentApi: unknown): parentApi is HasEditorConfig => {
  return Boolean((parentApi as HasEditorConfig).getEditorConfig);
};

export interface ControlGroupEditorConfig {
  hideDataViewSelector?: boolean;
  hideAdditionalSettings?: boolean;
  defaultDataViewId?: string;
  fieldFilterPredicate?: FieldFilterPredicate;
  controlStateTransform?: ControlStateTransform;
}

export type ControlStateTransform<State extends DataControlState = DataControlState> = (
  newState: Partial<State>,
  controlType: string
) => Partial<State>;

export type FieldFilterPredicate = (f: DataViewField) => boolean;

/**
 * ----------------------------------------------------------------
 * Control group state
 * ----------------------------------------------------------------
 */

export type FlattenedStickyControlState = Omit<StickyControlState, 'config'> &
  StickyControlState['config'];

export interface ControlGroupRuntimeState<
  State extends FlattenedStickyControlState = FlattenedStickyControlState
> {
  initialChildControlState: ControlPanelsState<State>;
  ignoreParentSettings?: LegacyIgnoreParentSettings; // these will be translated to panel-level settings
}

export interface ControlGroupCreationOptions {
  initialState?: Partial<ControlGroupRuntimeState>;
}

export type ControlGroupStateBuilder = typeof controlGroupStateBuilder;

export interface ControlPanelsState<
  State extends FlattenedStickyControlState = FlattenedStickyControlState
> {
  [panelId: string]: ControlPanelState<State>;
}

export type ControlPanelState<
  ControlState extends FlattenedStickyControlState = FlattenedStickyControlState
> = ControlState & {
  type: string; // prevents having to cast to the literal type
  order: number;
};
