/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UnifiedFieldListPlugin } from './plugin';
export type {
  FieldStatsResponse,
  BucketedAggregation,
  NumberStatsResult,
  TopValuesResult,
} from '../common/types';
export { FieldList, type FieldListProps } from './components/field_list';
export { FieldListGrouped, type FieldListGroupedProps } from './components/field_list_grouped';
export { FieldListFilters, type FieldListFiltersProps } from './components/field_list_filters';
export { FieldIcon, type FieldIconProps, getFieldIconProps } from './components/field_icon';
export type {
  FieldTopValuesBucketProps,
  FieldTopValuesBucketParams,
} from './components/field_stats';
export { FieldTopValuesBucket } from './components/field_stats';
export type {
  FieldStatsProps,
  FieldStatsServices,
  FieldStatsState,
} from './components/field_stats';
export { FieldStats } from './components/field_stats';
export {
  FieldPopover,
  type FieldPopoverProps,
  FieldPopoverHeader,
  type FieldPopoverHeaderProps,
  FieldPopoverVisualize,
  type FieldPopoverVisualizeProps,
} from './components/field_popover';
export {
  FieldVisualizeButton,
  type FieldVisualizeButtonProps,
  getVisualizeInformation,
  triggerVisualizeActions,
  triggerVisualizeActionsTextBasedLanguages,
  type VisualizeInformation,
} from './components/field_visualize_button';
export { loadFieldStats } from './services/field_stats';
export { loadFieldExisting } from './services/field_existing';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new UnifiedFieldListPlugin();
}
export type {
  UnifiedFieldListPluginSetup,
  UnifiedFieldListPluginStart,
  AddFieldFilterHandler,
  FieldListGroups,
  FieldsGroupDetails,
  FieldTypeKnown,
  GetCustomFieldType,
} from './types';
export { ExistenceFetchStatus, FieldsGroupNames } from './types';

export {
  useExistingFieldsFetcher,
  useExistingFieldsReader,
  resetExistingFieldsCache,
  type ExistingFieldsInfo,
  type ExistingFieldsFetcherParams,
  type ExistingFieldsFetcher,
  type ExistingFieldsReader,
} from './hooks/use_existing_fields';

export {
  useGroupedFields,
  type GroupedFieldsParams,
  type GroupedFieldsResult,
} from './hooks/use_grouped_fields';

export {
  useFieldFilters,
  type FieldFiltersParams,
  type FieldFiltersResult,
} from './hooks/use_field_filters';

export {
  useQuerySubscriber,
  hasQuerySubscriberData,
  type QuerySubscriberResult,
  type QuerySubscriberParams,
} from './hooks/use_query_subscriber';

export { wrapFieldNameOnDot } from './utils/wrap_field_name_on_dot';
export {
  getFieldTypeName,
  getFieldTypeDescription,
  KNOWN_FIELD_TYPES,
  getFieldType,
  getFieldIconType,
} from './utils/field_types';
