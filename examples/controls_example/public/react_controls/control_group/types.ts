/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ControlGroupChainingSystem,
  ControlsPanels,
} from '@kbn/controls-plugin/common/control_group/types';
import { ParentIgnoreSettings } from '@kbn/controls-plugin/public';
import { ControlStyle, ControlWidth } from '@kbn/controls-plugin/public/types';
import { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import {
  HasSerializableState,
  PresentationContainer,
  PublishesLastSavedState,
} from '@kbn/presentation-containers';
import {
  HasEditCapabilities,
  HasParentApi,
  PublishesDataLoading,
  PublishesFilters,
  PublishesUnifiedSearch,
  PublishingSubject,
} from '@kbn/presentation-publishing';
import { PublishesDataViews } from '@kbn/presentation-publishing/interfaces/publishes_data_views';
import { PublishesControlDisplaySettings } from '../types';

/** The control display settings published by the control group are the "default" */
type PublishesControlGroupDisplaySettings = PublishesControlDisplaySettings & {
  controlStyle: PublishingSubject<ControlStyle>;
};

export type ControlGroupApi = PresentationContainer &
  DefaultEmbeddableApi<ControlGroupSerializedState> &
  HasSerializableState &
  PublishesFilters &
  // PublishesSettings & // published so children can use it... Might be unnecessary?
  PublishesDataViews &
  HasEditCapabilities & // editing for control group settings - this will be a custom action
  PublishesDataLoading & // loading = true if any children loading
  // PublishesUnsavedChanges<PersistableControlGroupInput> & // unsaved changes = diff published filters + combine all children unsaved changes
  PublishesControlGroupDisplaySettings &
  Partial<HasParentApi<PublishesUnifiedSearch & PublishesLastSavedState>>;

export interface ControlGroupRuntimeState {
  chainingSystem: ControlGroupChainingSystem;
  defaultControlGrow: boolean;
  defaultControlWidth: ControlWidth;
  controlStyle: ControlStyle;
  panels: ControlsPanels;
  showApplySelections?: boolean;
  ignoreParentSettings?: ParentIgnoreSettings;
}

export type ControlGroupSerializedState = Omit<
  ControlGroupRuntimeState,
  'panels' | 'ignoreParentSettings' | 'defaultControlGrow' | 'defaultControlWidth'
> & {
  panelsJSON: string;
  ignoreParentSettingsJSON: string;
};
