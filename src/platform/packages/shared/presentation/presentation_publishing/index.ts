/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { isEmbeddableApiContext, type EmbeddableApiContext } from './embeddable_api_context';

export {
  type ComparatorFunction,
  type StateComparators,
  type WithAllKeys,
  runComparator,
  areComparatorsEqual,
  diffComparators,
  initializeStateManager,
  shouldLogStateDiff,
  logStateDiff,
} from './state_manager';
export {
  apiCanAccessViewMode,
  getInheritedViewMode,
  getViewModeSubject,
  type CanAccessViewMode,
} from './interfaces/can_access_view_mode';
export {
  apiCanLockHoverActions,
  type CanLockHoverActions,
} from './interfaces/can_lock_hover_actions';
export { fetch$, useFetchContext } from './interfaces/fetch/fetch';
export type { FetchContext } from './interfaces/fetch/fetch_context';
export {
  type PublishesPauseFetch,
  apiPublishesPauseFetch,
  type PublishesEditablePauseFetch,
  apiPublishesEditablePauseFetch,
} from './interfaces/fetch/publishes_pause_fetch';
export {
  initializeTimeRangeManager,
  timeRangeComparators,
  type SerializedTimeRange,
} from './interfaces/fetch/time_range_manager';
export { apiPublishesReload, type PublishesReload } from './interfaces/fetch/publishes_reload';
export {
  apiAppliesFilters,
  type AppliesFilters,
  apiAppliesTimeslice,
  type AppliesTimeslice,
  apiHasUseGlobalFiltersSetting,
  type HasUseGlobalFiltersSetting,
} from './interfaces/fetch/applies_filters';
export {
  apiPublishesFilters,
  apiPublishesPartialUnifiedSearch,
  apiPublishesTimeRange,
  apiPublishesTimeslice,
  apiPublishesUnifiedSearch,
  apiPublishesWritableUnifiedSearch,
  useSearchApi,
  type PublishesFilters,
  type PublishesTimeRange,
  type PublishesTimeslice,
  type PublishesUnifiedSearch,
  type PublishesWritableUnifiedSearch,
} from './interfaces/fetch/publishes_unified_search';
export {
  apiPublishesProjectRouting,
  type PublishesProjectRouting,
  apiPublishesProjectRoutingOverrides,
  type ProjectRoutingOverrides,
  type PublishesProjectRoutingOverrides,
} from './interfaces/fetch/publishes_project_routing';
export {
  apiHasAppContext,
  type EmbeddableAppContext,
  type HasAppContext,
} from './interfaces/has_app_context';
export {
  apiHasDisableTriggers,
  areTriggersDisabled,
  type HasDisableTriggers,
} from './interfaces/has_disable_triggers';
export { hasEditCapabilities, type HasEditCapabilities } from './interfaces/has_edit_capabilities';
export {
  canOverrideHoverActions,
  type CanOverrideHoverActions,
} from './interfaces/can_override_hover_actions';
export {
  hasReadOnlyCapabilities,
  type HasReadOnlyCapabilities,
} from './interfaces/has_read_only_capabilities';
export {
  apiHasExecutionContext,
  type HasExecutionContext,
} from './interfaces/has_execution_context';
export {
  apiHasLibraryTransforms,
  type HasLibraryTransforms,
} from './interfaces/has_library_transforms';
export { apiHasParentApi, type HasParentApi } from './interfaces/has_parent_api';
export {
  apiHasSerializableState,
  type HasSerializableState,
  type SerializedPanelState,
} from './interfaces/has_serializable_state';
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
  hasBlockingError,
  type PublishesBlockingError,
} from './interfaces/publishes_blocking_error';
export {
  apiPublishesDataLoading,
  type PublishesDataLoading,
} from './interfaces/publishes_data_loading';
export {
  apiPublishesDataViews,
  type PublishesDataViews,
  type PublishesWritableDataViews,
} from './interfaces/publishes_data_views';
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
export { apiPublishesRendered, type PublishesRendered } from './interfaces/publishes_rendered';
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
  apiPublishesDescription,
  apiPublishesWritableDescription,
  getDescription,
  type PublishesDescription,
  type PublishesWritableDescription,
} from './interfaces/titles/publishes_description';
export {
  apiPublishesTitle,
  apiPublishesWritableTitle,
  getTitle,
  type PublishesTitle,
  type PublishesWritableTitle,
} from './interfaces/titles/publishes_title';
export {
  initializeTitleManager,
  stateHasTitles,
  titleComparators,
  type TitlesApi,
  type SerializedTitles,
} from './interfaces/titles/title_manager';
export {
  useBatchedOptionalPublishingSubjects,
  useBatchedPublishingSubjects,
  usePublishingSubject,
  useStateFromPublishingSubject,
  type PublishingSubject,
} from './publishing_subject';
export { SAVED_OBJECT_REF_NAME, findSavedObjectRef } from './saved_object_ref';
