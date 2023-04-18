/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataViewField } from '@kbn/data-views-plugin/common';
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UnifiedFieldListPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UnifiedFieldListPluginStart {}

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
