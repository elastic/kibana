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
import { FilterBadgeGroup } from './filter_badge_group';
import type { LabelOptions } from './filter_badge_utils';
import { FILTER_ITEM_OK, getValueLabel, getConditionalOperationType } from './filter_badge_utils';
import { FilterContent } from './filter_badge_expression_filter_content';
import { ConditionTypes } from './filter_badge_condition_types';

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
