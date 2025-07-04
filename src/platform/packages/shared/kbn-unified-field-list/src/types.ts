/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { EuiButtonIconProps, EuiButtonProps } from '@elastic/eui';
import type { FieldTypeKnown, FieldBase } from '@kbn/field-utils/types';

export interface BucketedAggregation<KeyType = string> {
  buckets: Array<{
    key: KeyType;
    count: number;
  }>;
  areExamples?: boolean; // whether `topValues` holds examples in buckets rather than top values
}

export interface NumberSummary {
  minValue: number | null;
  maxValue: number | null;
}

export interface FieldStatsResponse<KeyType = unknown> {
  // Total count of documents
  totalDocuments?: number;
  // If sampled, the exact number of matching documents
  sampledDocuments?: number;
  // If sampled, the exact number of values sampled. Can be higher than documents
  // because Elasticsearch supports arrays for all fields
  sampledValues?: number;
  // Histogram and values are based on distinct values, not based on documents
  histogram?: BucketedAggregation<KeyType>;
  topValues?: BucketedAggregation<KeyType>;
  numberSummary?: NumberSummary;
}

export type AddFieldFilterHandler = (
  field: DataViewField | '_exists_',
  value: unknown,
  type: '+' | '-'
) => void;

export enum ExistenceFetchStatus {
  failed = 'failed',
  succeeded = 'succeeded',
  unknown = 'unknown',
}

export type FieldListItem = FieldBase;

export enum FieldsGroupNames {
  SpecialFields = 'SpecialFields',
  SelectedFields = 'SelectedFields',
  PopularFields = 'PopularFields',
  AvailableFields = 'AvailableFields',
  EmptyFields = 'EmptyFields',
  MetaFields = 'MetaFields',
  UnmappedFields = 'UnmappedFields',
  SmartFields = 'SmartFields',
}

export interface FieldsGroupDetails {
  showInAccordion: boolean;
  isInitiallyOpen: boolean;
  title: string;
  helpText?: string;
  isAffectedByGlobalFilter: boolean;
  isAffectedByTimeFilter: boolean;
  hideDetails?: boolean;
  defaultNoFieldsMessage?: string;
  hideIfEmpty?: boolean;
}

export interface FieldsGroup<T extends FieldListItem> extends FieldsGroupDetails {
  fields: T[];
  fieldCount: number;
  fieldSearchHighlight?: string;
}

export type FieldListGroups<T extends FieldListItem> = {
  [key in FieldsGroupNames]?: FieldsGroup<T>;
};

export interface AdditionalFieldGroups<T extends FieldListItem = FieldListItem> {
  smartFields?: FieldsGroup<T>['fields'];
  fallbackFields?: Record<string, string[]>;
}

export type GetCustomFieldType<T extends FieldListItem> = (field: T) => FieldTypeKnown;

export interface RenderFieldItemParams<T extends FieldListItem> {
  field: T;
  hideDetails?: boolean;
  itemIndex: number;
  groupIndex: number;
  groupName: FieldsGroupNames;
  fieldSearchHighlight?: string;
}

export type OverrideFieldGroupDetails = (
  groupName: FieldsGroupNames
) => Partial<FieldsGroupDetails> | undefined | null;

export type TimeRangeUpdatesType = 'search-session' | 'timefilter';

export type ButtonAddFieldVariant = 'primary' | 'toolbar';

export type SearchMode = 'documents' | 'text-based';

export interface UnifiedFieldListSidebarContainerCreationOptions {
  /**
   * Plugin ID
   */
  originatingApp: string;

  /**
   * Pass `true` to enable the compressed view
   */
  compressed?: boolean;

  /**
   * Your app name: "discover", "lens", etc. If not provided, sections and sidebar toggle states would not be persisted.
   */
  localStorageKeyPrefix?: string;

  /**
   * Pass `timefilter` only if you are not using search sessions for the global search
   */
  timeRangeUpdatesType?: TimeRangeUpdatesType;

  /**
   * Choose how the bottom "Add a field" button should look like. Default `primary`.
   */
  buttonAddFieldVariant?: ButtonAddFieldVariant;

  /**
   * Pass `true` to make the sidebar collapsible. Additionally, define `localStorageKeyPrefix` to persist toggle state.
   */
  showSidebarToggleButton?: boolean;

  /**
   * Pass `true` to skip auto fetching of fields existence info
   */
  disableFieldsExistenceAutoFetching?: boolean;

  /**
   * Pass `true` to see all multi fields flattened in the list. Otherwise, they will show in a field popover.
   */
  disableMultiFieldsGroupingByParent?: boolean;

  /**
   * Pass `true` to not have "Popular Fields" section in the field list
   */
  disablePopularFields?: boolean;

  /**
   * Pass `true` to have non-draggable field list items (like in the mobile flyout)
   */
  disableFieldListItemDragAndDrop?: boolean;

  /**
   * This button will be shown in mobile view
   */
  buttonPropsToTriggerFlyout?: Partial<EuiButtonProps>;

  /**
   * Custom props like `aria-label`
   */
  buttonAddFieldToWorkspaceProps?: Partial<EuiButtonIconProps>;

  /**
   * Custom props like `aria-label`
   */
  buttonRemoveFieldFromWorkspaceProps?: Partial<EuiButtonIconProps>;

  /**
   * Return custom configuration for field list sections
   */
  onOverrideFieldGroupDetails?: OverrideFieldGroupDetails;

  /**
   * Use this predicate to hide certain fields
   * @param field
   */
  onSupportedFieldFilter?: (field: DataViewField) => boolean;

  /**
   * Custom `data-test-subj`. Mostly for preserving legacy values.
   */
  dataTestSubj?: {
    fieldListAddFieldButtonTestSubj?: string;
    fieldListSidebarDataTestSubj?: string;
    fieldListItemStatsDataTestSubj?: string;
    fieldListItemDndDataTestSubjPrefix?: string;
    fieldListItemPopoverDataTestSubj?: string;
    fieldListItemPopoverHeaderDataTestSubjPrefix?: string;
  };
}

/**
 * The service used to manage the state of the container
 */
export interface UnifiedFieldListSidebarContainerStateService {
  creationOptions: UnifiedFieldListSidebarContainerCreationOptions;
}
