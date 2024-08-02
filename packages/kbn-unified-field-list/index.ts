/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { FieldList, type FieldListProps } from './src/components/field_list';
export { FieldListGrouped, type FieldListGroupedProps } from './src/components/field_list_grouped';
export { FieldListFilters, type FieldListFiltersProps } from './src/components/field_list_filters';
export { FieldItemButton, type FieldItemButtonProps } from './src/components/field_item_button';
export type {
  FieldTopValuesBucketProps,
  FieldTopValuesBucketParams,
} from './src/components/field_stats';
export { FieldTopValuesBucket } from './src/components/field_stats';
export type {
  FieldStatsProps,
  FieldStatsServices,
  FieldStatsState,
} from './src/components/field_stats';
export { FieldStats } from './src/components/field_stats';
export {
  FieldPopover,
  type FieldPopoverProps,
  FieldPopoverHeader,
  type FieldPopoverHeaderProps,
  FieldPopoverFooter,
  type FieldPopoverFooterProps,
} from './src/components/field_popover';
export {
  FieldVisualizeButton,
  type FieldVisualizeButtonProps,
  getVisualizeInformation,
  triggerVisualizeActions,
  triggerVisualizeActionsTextBasedLanguages,
  type VisualizeInformation,
} from './src/components/field_visualize_button';
export { loadFieldStats } from './src/services/field_stats';
export { loadFieldExisting } from './src/services/field_existing';

export type {
  FieldStatsResponse,
  BucketedAggregation,
  NumberSummary,
  AddFieldFilterHandler,
  FieldsGroup,
  FieldListGroups,
  FieldsGroupDetails,
  FieldListItem,
  GetCustomFieldType,
  RenderFieldItemParams,
  SearchMode,
  AdditionalFieldGroups,
} from './src/types';
export { ExistenceFetchStatus, FieldsGroupNames } from './src/types';

export {
  useExistingFieldsFetcher,
  useExistingFieldsReader,
  resetExistingFieldsCache,
  type ExistingFieldsInfo,
  type ExistingFieldsFetcherParams,
  type ExistingFieldsFetcher,
  type ExistingFieldsReader,
} from './src/hooks/use_existing_fields';

export {
  useGroupedFields,
  type GroupedFieldsParams,
  type GroupedFieldsResult,
} from './src/hooks/use_grouped_fields';

export {
  useFieldFilters,
  type FieldFiltersParams,
  type FieldFiltersResult,
} from './src/hooks/use_field_filters';

export {
  useQuerySubscriber,
  hasQuerySubscriberData,
  getSearchMode,
  type QuerySubscriberResult,
  type QuerySubscriberParams,
} from './src/hooks/use_query_subscriber';

export {
  UnifiedFieldListSidebarContainer,
  type UnifiedFieldListSidebarContainerApi,
  type UnifiedFieldListSidebarContainerProps,
} from './src/containers/unified_field_list_sidebar';

export * from './src/utils/fallback_fields';
export { SmartFieldFallbackTooltip } from './src/components/fallback_fields';
