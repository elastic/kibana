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
import { EuiFlexGroup, EuiFlexItem, EuiTextColor } from '@elastic/eui';
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

const getValue = (value: string | number) => {
  return (
    <EuiFlexItem grow={false}>
      <EuiTextColor color={typeof value === 'string' ? '#387765' : '#ac4e6d'}>{value}</EuiTextColor>
    </EuiFlexItem>
  );
};

const getFilterContent = (filter: Filter, label: LabelOptions, prefix: string | JSX.Element) => {
  switch (filter.meta.type) {
    case FILTERS.EXISTS:
      return (
        <>
          {prefix} <EuiFlexItem grow={false}>{filter.meta.key}:</EuiFlexItem>
          {getValue(`${existsOperator.message}`)}
        </>
      );
    case FILTERS.PHRASES:
      return (
        <>
          {prefix} <EuiFlexItem grow={false}>{filter.meta.key}:</EuiFlexItem>
          {getValue(`${isOneOfOperator.message} ${label.title}`)}
        </>
      );
    case FILTERS.QUERY_STRING:
      return (
        <>
          {prefix} {getValue(`${label.title}`)}
        </>
      );
    case FILTERS.PHRASE:
    case FILTERS.RANGE:
      return (
        <>
          {prefix} <EuiFlexItem grow={false}>{filter.meta.key}:</EuiFlexItem>
          {getValue(label.title)}
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
        <EuiFlexItem grow={false}>
          <EuiTextColor color="danger">{prefixText}</EuiTextColor>
        </EuiFlexItem>
      ) : (
        prefixText
      );
  }

  return (
    <>
      {conditionalOperationType ? (
        <>
          <EuiFlexItem>
            <EuiTextColor color="rgb(0, 113, 194)">(</EuiTextColor>
          </EuiFlexItem>
          <FilterBadgeGroup
            filters={Array.isArray(filter) ? filter : filter.meta?.params}
            dataView={dataView}
            conditionType={conditionalOperationType}
          />
          <EuiFlexItem>
            <EuiTextColor color="rgb(0, 113, 194)">)</EuiTextColor>
          </EuiFlexItem>
        </>
      ) : (
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="xs">{getFilterContent(filter, label, prefix)}</EuiFlexGroup>
        </EuiFlexItem>
      )}
    </>
  );
}
