/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import {
  defineContentListFilter,
  defineContentListSortField,
  type ContentListSortField,
  type ResolvedContentListFilter,
} from '@kbn/content-list-provider-client';
import type { EventAnnotationGroupContent } from '@kbn/event-annotation-common';

export const DATA_VIEW_FILTER_FIELD = 'dataView';
export const NO_DATA_VIEW_FILTER = '__no_data_view__';

const i18nText = {
  title: i18n.translate('eventAnnotationListing.dataViewFilter.title', {
    defaultMessage: 'Data view',
  }),
  emptyMessage: i18n.translate('eventAnnotationListing.dataViewFilter.emptyMessage', {
    defaultMessage: 'No data views available',
  }),
  noMatchesMessage: i18n.translate('eventAnnotationListing.dataViewFilter.noMatchesMessage', {
    defaultMessage: 'No data view matches the search',
  }),
  noDataViewLabel: i18n.translate('eventAnnotationListing.dataViewFilter.noDataViewLabel', {
    defaultMessage: 'No data view',
  }),
};

export type DataViewFilterDefinition = ResolvedContentListFilter<string>;
export type DataViewSortField = ContentListSortField;

export const createDataViewFilterDefinition = (
  dataViewNameMap: Record<string, string>
): DataViewFilterDefinition =>
  defineContentListFilter({
    id: DATA_VIEW_FILTER_FIELD,
    title: i18nText.title,
    getItemValue: (item: EventAnnotationGroupContent) => item.attributes.indexPatternId,
    options: {
      items: Object.entries(dataViewNameMap),
      getOptionValue: ([id]) => id,
      getOptionLabel: ([, name]) => name,
      unmatchedOption: {
        value: NO_DATA_VIEW_FILTER,
        label: i18nText.noDataViewLabel,
      },
    },
    emptyMessage: i18nText.emptyMessage,
    noMatchesMessage: i18nText.noMatchesMessage,
  });

export const createDataViewSortField = (
  filterDefinition: DataViewFilterDefinition
): DataViewSortField =>
  defineContentListSortField<EventAnnotationGroupContent>({
    id: DATA_VIEW_FILTER_FIELD,
    title: i18nText.title,
    getValue: (item) =>
      filterDefinition.getLabelForValue(item.attributes.indexPatternId) ?? i18nText.noDataViewLabel,
  });
