/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { apiCanAddNewPanel, type CanAddNewPanel } from './interfaces/can_add_new_panel';
export { apiHasSerializedChildState, type HasSerializedChildState } from './interfaces/child_state';
export { childrenUnsavedChanges$ } from './interfaces/unsaved_changes/children_unsaved_changes';
export { initializeUnsavedChanges } from './interfaces/unsaved_changes/initialize_unsaved_changes';
export {
  apiCanDuplicatePanels,
  apiCanExpandPanels,
  apiCanPinPanels,
  type CanDuplicatePanels,
  type CanExpandPanels,
  type CanPinPanels,
} from './interfaces/panel_management';
export {
  apiCanBeDuplicated,
  apiCanBeCustomized,
  apiCanBeExpanded,
  apiCanBePinned,
  type IsDuplicable,
  type IsExpandable,
  type IsCustomizable,
  type IsPinnable,
  type HasPanelCapabilities,
} from './interfaces/panel_capabilities';
export { type CanAddNewSection, apiCanAddNewSection } from './interfaces/can_add_new_section';
export {
  canTrackContentfulRender,
  type TrackContentfulRender,
} from './interfaces/performance_trackers';
export {
  type HasLastSavedChildState,
  apiHasLastSavedChildState,
} from './interfaces/last_saved_child_state';
export {
  apiIsPresentationContainer,
  combineCompatibleChildrenApis,
  getContainerParentFromAPI,
  listenForCompatibleApi,
  apiHasSections,
  type PanelPackage,
  type PresentationContainer,
  type HasSections,
} from './interfaces/presentation_container';
export { apiPublishesSettings, type PublishesSettings } from './interfaces/publishes_settings';
export { apiCanFocusPanel, type CanFocusPanel } from './interfaces/can_focus_panel';
export {
  apiSupportsPassThroughContext,
  type PassThroughContext,
} from './interfaces/pass_through_context';
