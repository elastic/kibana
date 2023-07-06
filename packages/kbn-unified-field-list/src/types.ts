/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataViewField } from '@kbn/data-views-plugin/common';

export interface BucketedAggregation<KeyType = string> {
  buckets: Array<{
    key: KeyType;
    count: number;
  }>;
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

export interface FieldListItem {
  name: DataViewField['name'];
  type?: DataViewField['type'];
  displayName?: DataViewField['displayName'];
  count?: DataViewField['count'];
  timeSeriesMetric?: DataViewField['timeSeriesMetric'];
  esTypes?: DataViewField['esTypes'];
  scripted?: DataViewField['scripted'];
}

export enum FieldsGroupNames {
  SpecialFields = 'SpecialFields',
  SelectedFields = 'SelectedFields',
  PopularFields = 'PopularFields',
  AvailableFields = 'AvailableFields',
  EmptyFields = 'EmptyFields',
  MetaFields = 'MetaFields',
  UnmappedFields = 'UnmappedFields',
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

export type FieldTypeKnown = Exclude<
  DataViewField['timeSeriesMetric'] | DataViewField['type'],
  undefined
>;

export type GetCustomFieldType<T extends FieldListItem> = (field: T) => FieldTypeKnown;

export interface RenderFieldItemParams<T extends FieldListItem> {
  field: T;
  hideDetails?: boolean;
  itemIndex: number;
  groupIndex: number;
  groupName: FieldsGroupNames;
  fieldSearchHighlight?: string;
}
