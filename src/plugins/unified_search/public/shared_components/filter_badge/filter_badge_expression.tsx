/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import { FILTERS } from '@kbn/es-query';
import { EuiFlexItem, EuiTextColor } from '@elastic/eui';
import { getDisplayValueFromFilter, getIndexPatternFromFilter } from '@kbn/data-plugin/public';
import { existsOperator, isOneOfOperator } from '../../filter_bar/filter_editor';
import { FilterBadgeGroup } from './filter_badge_group';
import { getConditionalOperationType } from '../../filters_builder/filters_builder_utils';
import { ConditionTypes } from '../../filters_builder/filters_builder_condition_types';

const FILTER_ITEM_OK = '';
const FILTER_ITEM_WARNING = 'warn';
const FILTER_ITEM_ERROR = 'error';

export type FilterLabelStatus =
  | typeof FILTER_ITEM_OK
  | typeof FILTER_ITEM_WARNING
  | typeof FILTER_ITEM_ERROR;

interface LabelOptions {
  title: string;
  status: FilterLabelStatus;
  message?: string;
}

const getValue = (text?: string) => {
  return text;
};

const getFilterContent = (filter: Filter, label: LabelOptions, prefix: string | JSX.Element) => {
  switch (filter.meta.type) {
    case FILTERS.EXISTS:
      return (
        <>
          {prefix}
          {filter.meta.key}: {getValue(`${existsOperator.message}`)}
        </>
      );
    case FILTERS.PHRASES:
      return (
        <>
          {prefix}
          {filter.meta.key}: {getValue(`${isOneOfOperator.message} ${label.title}`)}
        </>
      );
    case FILTERS.QUERY_STRING:
      return (
        <>
          {prefix}
          {getValue(`${label.title}`)}
        </>
      );
    case FILTERS.PHRASE:
    case FILTERS.RANGE:
      return (
        <>
          {prefix}
          {filter.meta.key}: {getValue(label.title)}
        </>
      );
    default:
      return (
        <>
          {prefix}
          {getValue(`${JSON.stringify(filter.query) || filter.meta.value}`)}
        </>
      );
  }
};

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

function getValueLabel(filter: Filter, dataView: DataView): LabelOptions {
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
      label.status = FILTER_ITEM_ERROR;
      label.title = `Error`;
      label.message = e.message;
    }
  } else {
    label.status = FILTER_ITEM_WARNING;
    label.title = `Warning`;
    label.message = 'Field {fieldName} does not exist in current view';
  }

  return label;
}

export interface FilterBadgeExpressionProps {
  filter: Filter;
  dataView: DataView;
  conditionType?: ConditionTypes;
}

export function FilterExpressionBadge({ filter, dataView }: FilterBadgeExpressionProps) {
  const conditionalOperationType = getConditionalOperationType(filter);
  let label: LabelOptions = {
    title: '',
    message: '',
    status: FILTER_ITEM_OK,
  };
  let prefix: any;

  if (!conditionalOperationType) {
    label = getValueLabel(filter, dataView);

    const prefixText = filter?.meta?.negate ? ` NOT ` : '';
    prefix =
      filter?.meta?.negate && !filter?.meta?.disabled ? (
        <EuiTextColor color="danger">{prefixText}</EuiTextColor>
      ) : (
        prefixText
      );
  }

  return (
    <>
      {conditionalOperationType ? (
        <FilterBadgeGroup
          filters={Array.isArray(filter) ? filter : filter.meta?.params}
          dataView={dataView}
          conditionType={conditionalOperationType}
        />
      ) : (
        <EuiFlexItem>{getFilterContent(filter, label, prefix)}</EuiFlexItem>
      )}
    </>
  );
}
