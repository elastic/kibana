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
import { EuiFlexGroup, EuiFlexItem, EuiTextColor } from '@elastic/eui';
import { getDisplayValueFromFilter, getIndexPatternFromFilter } from '@kbn/data-plugin/public';
import { i18n } from '@kbn/i18n';
import { FilterBadgeGroup } from './filter_badge_group';
import { getConditionalOperationType } from '../../filters_builder/filters_builder_utils';
import { ConditionTypes } from '../../filters_builder/filters_builder_condition_types';
import { FilterContent } from './filter_badge_expression_filter_content';

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

  if (!conditionalOperationType) {
    label = getValueLabel(filter, dataView);
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
          <EuiFlexGroup gutterSize="xs">
            <FilterContent filter={filter} label={label} />
          </EuiFlexGroup>
        </EuiFlexItem>
      )}
    </>
  );
}
