/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface EmbeddableApiContext {
  /**
   * TODO: once all actions are entirely decoupled from the embeddable system, this key should be renamed to "api"
   * to reflect the fact that this context could contain any api.
   */
  embeddable: unknown;
}

export {
  getInitialValuesFromComparators,
  runComparators,
  type ComparatorDefinition,
  type ComparatorFunction,
  type StateComparators,
} from './comparators';
export {
  apiCanAccessViewMode,
  getInheritedViewMode,
  getViewModeSubject,
  useInheritedViewMode,
  type CanAccessViewMode,
} from './interfaces/can_access_view_mode';
export { initializeTimeRange } from './interfaces/fetch/initialize_time_range';
export {
  onFetchContextChanged,
  type FetchContext,
} from './interfaces/fetch/on_fetch_context_changed';
export {
  apiPublishesPartialUnifiedSearch,
  apiPublishesTimeRange,
  apiPublishesUnifiedSearch,
  apiPublishesWritableUnifiedSearch,
  type PublishesTimeRange,
  type PublishesUnifiedSearch,
  type PublishesWritableUnifiedSearch,
} from './interfaces/fetch/publishes_unified_search';
export { apiHasDisableTriggers, type HasDisableTriggers } from './interfaces/has_disable_triggers';
export { hasEditCapabilities, type HasEditCapabilities } from './interfaces/has_edit_capabilities';
export {
  apiHasLegacyLibraryTransforms,
  apiHasLibraryTransforms,
  type HasLegacyLibraryTransforms,
  type HasLibraryTransforms,
} from './interfaces/has_library_transforms';
export { apiHasParentApi, type HasParentApi } from './interfaces/has_parent_api';
export {
  apiHasSupportedTriggers,
  type HasSupportedTriggers,
} from './interfaces/has_supported_triggers';
export {
  apiHasType,
  apiIsOfType,
  type HasType,
  type HasTypeDisplayName,
} from './interfaces/has_type';
export { apiHasUniqueId, type HasUniqueId } from './interfaces/has_uuid';
export {
  apiPublishesBlockingError,
  type PublishesBlockingError,
} from './interfaces/publishes_blocking_error';
export {
  apiPublishesDataLoading,
  type PublishesDataLoading,
} from './interfaces/publishes_data_loading';
export { apiPublishesDataViews, type PublishesDataViews } from './interfaces/publishes_data_views';
export {
  apiPublishesDisabledActionIds,
  type PublishesDisabledActionIds,
} from './interfaces/publishes_disabled_action_ids';
export {
  apiPublishesPhaseEvents,
  type PhaseEvent,
  type PhaseEventType,
  type PublishesPhaseEvents,
} from './interfaces/publishes_phase_events';
export {
  apiPublishesSavedObjectId,
  type PublishesSavedObjectId,
} from './interfaces/publishes_saved_object_id';
export {
  apiPublishesUnsavedChanges,
  type PublishesUnsavedChanges,
} from './interfaces/publishes_unsaved_changes';
export {
  apiPublishesViewMode,
  apiPublishesWritableViewMode,
  type PublishesViewMode,
  type PublishesWritableViewMode,
  type ViewMode,
} from './interfaces/publishes_view_mode';
export {
  apiPublishesPanelDescription,
  apiPublishesWritablePanelDescription,
  type PublishesPanelDescription,
  type PublishesWritablePanelDescription,
} from './interfaces/titles/publishes_panel_description';
export {
  apiPublishesPanelTitle,
  apiPublishesWritablePanelTitle,
  getPanelTitle,
  type PublishesPanelTitle,
  type PublishesWritablePanelTitle,
} from './interfaces/titles/publishes_panel_title';
export { initializeTitles, type SerializedTitles } from './interfaces/titles/titles_api';
export {
  useBatchedOptionalPublishingSubjects,
  useBatchedPublishingSubjects,
  usePublishingSubject,
  useStateFromPublishingSubject,
  type PublishingSubject,
} from './publishing_subject';
