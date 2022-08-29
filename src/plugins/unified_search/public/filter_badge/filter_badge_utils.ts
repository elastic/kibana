/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getDisplayValueFromFilter, getIndexPatternFromFilter } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';

export const FILTER_ITEM_OK = '';
export const FILTER_ITEM_WARNING = 'warn';
export const FILTER_ITEM_ERROR = 'error';

export type FilterLabelStatus =
  | typeof FILTER_ITEM_OK
  | typeof FILTER_ITEM_WARNING
  | typeof FILTER_ITEM_ERROR;

export interface LabelOptions {
  title: string;
  status: FilterLabelStatus;
  message?: string;
}

/**
 * Checks if filter field exists in any of the index patterns provided,
 * Because if so, a filter for the wrong index pattern may still be applied.
 * This function makes this behavior explicit, but it needs to be revised.
 */
function isFilterApplicable(filter: Filter, dataView: DataView[]) {
  // Any filter is applicable if no index patterns were provided to FilterBar.
  if (!dataView.length) return true;

  const ip = getIndexPatternFromFilter(filter, dataView);
  if (ip) return true;

  const allFields = dataView.map((indexPattern) => {
    return indexPattern.fields.map((field) => field.name);
  });
  const flatFields = allFields.reduce((acc: string[], it: string[]) => [...acc, ...it], []);
  return flatFields.includes(filter.meta?.key || '');
}

export function getValueLabel(filter: Filter, dataView: DataView): LabelOptions {
  const label: LabelOptions = {
    title: '',
    message: '',
    status: FILTER_ITEM_OK,
  };

  if (filter.meta?.isMultiIndex) {
    return label;
  }

  if (isFilterApplicable(filter, [dataView])) {
    try {
      label.title = getDisplayValueFromFilter(filter, [dataView]);
    } catch (e) {
      label.status = FILTER_ITEM_WARNING;
      label.title = i18n.translate('unifiedSearch.filter.filterBar.labelWarningText', {
        defaultMessage: `Warning`,
      });
      label.message = e.message;
    }
  } else {
    label.status = FILTER_ITEM_WARNING;
    label.title = i18n.translate('unifiedSearch.filter.filterBar.labelWarningText', {
      defaultMessage: `Warning`,
    });
    label.message = i18n.translate('unifiedSearch.filter.filterBar.labelWarningInfo', {
      defaultMessage: `Field {fieldName} does not exist in current view`,
      values: { fieldName: filter.meta.key },
    });
  }

  return label;
}
