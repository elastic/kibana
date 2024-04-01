/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export {
  apiPublishesLastSavedState,
  getLastSavedStateSubjectForChild,
  type PublishesLastSavedState,
} from './interfaces/last_saved_state';
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
  type PanelPackage,
  type PresentationContainer,
} from './interfaces/presentation_container';
export {
  apiHasSerializableState,
  type HasSerializableState,
  type SerializedPanelState,
} from './interfaces/serialized_state';
export { tracksOverlays, type TracksOverlays } from './interfaces/tracks_overlays';
