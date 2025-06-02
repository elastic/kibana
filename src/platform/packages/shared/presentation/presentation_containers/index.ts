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
  type CanDuplicatePanels,
  type CanExpandPanels,
} from './interfaces/panel_management';
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
  type PanelPackage,
  type PresentationContainer,
} from './interfaces/presentation_container';
export { apiPublishesSettings, type PublishesSettings } from './interfaces/publishes_settings';
export { tracksOverlays, type TracksOverlays } from './interfaces/tracks_overlays';
