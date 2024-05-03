/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  HasSerializableState,
  PresentationContainer,
  PublishesLastSavedState,
} from '@kbn/presentation-containers';
import { PublishesSettings } from '@kbn/presentation-containers/interfaces/publishes_settings';
import {
  HasEditCapabilities,
  HasParentApi,
  HasType,
  HasUniqueId,
  PublishesBlockingError,
  PublishesDataLoading,
  PublishesDisabledActionIds,
  PublishesFilter,
  PublishesFilters,
  PublishesPanelTitle,
  PublishesTimeslice,
  PublishesUnifiedSearch,
  PublishesUnsavedChanges,
  StateComparators,
} from '@kbn/presentation-publishing';

export type ControlGroupApi = PresentationContainer &
  HasSerializableState &
  PublishesFilters &
  PublishesSettings &
  PublishesUnsavedChanges & // unsaved changes = diff published filters + combine all children unsaved changes
  Partial<HasParentApi<PublishesUnifiedSearch & PublishesLastSavedState>>;

export type DefaultControlApi<State extends object = object> = (
  | PublishesFilter
  | PublishesTimeslice
) &
  PublishesDataLoading &
  PublishesBlockingError &
  PublishesUnsavedChanges &
  PublishesDisabledActionIds &
  PublishesPanelTitle &
  HasType &
  HasUniqueId &
  HasEditCapabilities &
  HasSerializableState<State> &
  HasParentApi<ControlGroupApi>;

export type ControlApiRegistration<State extends object = object> = Omit<
  DefaultControlApi<State>,
  'uuid' | 'parent' | 'type' | 'unsavedChanges' | 'resetUnsavedChanges'
>;
export interface ControlFactory<State extends object = object> {
  type: string;
  getIconType: () => string;
  getDisplayName: () => string;
  getSupportedFieldTypes: () => string[];
  // isFieldCompatible: (field: DataViewField) => boolean;
  buildControl: (
    initialState: State,
    buildApi: (
      apiRegistration: ControlApiRegistration<State>,
      comparators: StateComparators<State>
    ) => DefaultControlApi<State>,
    uuid: string,
    parentApi?: ControlGroupApi
  ) => { api: DefaultControlApi<State>; Component: React.FC<{}> };
}
