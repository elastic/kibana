/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { apiCanAddNewPanel, type CanAddNewPanel } from './interfaces/can_add_new_panel';
export {
  apiHasRuntimeChildState,
  apiHasSerializedChildState,
  type HasRuntimeChildState,
  type HasSerializedChildState,
} from './interfaces/child_state';
export { childrenUnsavedChanges$ } from './interfaces/unsaved_changes/children_unsaved_changes';
export { initializeUnsavedChanges } from './interfaces/unsaved_changes/initialize_unsaved_changes';
export {
  apiHasSaveNotification,
  type HasSaveNotification,
} from './interfaces/has_save_notification';
export {
  apiCanDuplicatePanels,
  apiCanExpandPanels,
  type CanDuplicatePanels,
  type CanExpandPanels,
} from './interfaces/panel_management';
export {
  apiIsPresentationContainer,
  getContainerParentFromAPI,
  listenForCompatibleApi,
  combineCompatibleChildrenApis,
  type PanelPackage,
  type PresentationContainer,
} from './interfaces/presentation_container';
export {
  apiHasSerializableState,
  type HasSerializableState,
  type HasSnapshottableState,
  type SerializedPanelState,
} from './interfaces/serialized_state';
export { tracksOverlays, type TracksOverlays } from './interfaces/tracks_overlays';
export {
  canTrackContentfulRender,
  type TrackContentfulRender,
  type TracksQueryPerformance,
} from './interfaces/performance_trackers';
