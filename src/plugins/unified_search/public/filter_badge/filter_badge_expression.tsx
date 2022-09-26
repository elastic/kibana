/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import { EuiTextColor, useEuiTheme } from '@elastic/eui';
import classNames from 'classnames';
import { css } from '@emotion/css';
import { FilterBadgeGroup } from './filter_badge_group';
import type { LabelOptions } from './filter_badge_utils';
import { FILTER_ITEM_OK, getValueLabel } from './filter_badge_utils';
import { FilterContent } from './filter_badge_expression_filter_content';
import { ConditionTypes, getConditionalOperationType } from '../utils';

export interface FilterBadgeExpressionProps {
  filter: Filter;
  dataView: DataView;
  conditionType?: ConditionTypes;
}

export function FilterExpressionBadge({ filter, dataView }: FilterBadgeExpressionProps) {
  const { euiTheme } = useEuiTheme();
  const conditionalOperationType = getConditionalOperationType(filter);

  const paddingLeft = useMemo(
    () => css`
      padding-left: ${euiTheme.size.xxs};
    `,
    [euiTheme.size.xxs]
  );

  const paddingRight = useMemo(
    () => css`
      padding-right: ${euiTheme.size.xxs};
    `,
    [euiTheme.size.xxs]
  );

  let label: LabelOptions = {
    title: '',
    message: '',
    status: FILTER_ITEM_OK,
  };

  if (!conditionalOperationType) {
    label = getValueLabel(filter, dataView);
  }

  return conditionalOperationType ? (
    <>
      <span className={paddingLeft}>
        <EuiTextColor color="rgb(0, 113, 194)"> ( </EuiTextColor>
      </span>
      <FilterBadgeGroup
        filters={Array.isArray(filter) ? filter : filter.meta?.params}
        dataView={dataView}
        conditionType={conditionalOperationType}
      />
      <span className={paddingRight}>
        <EuiTextColor color="rgb(0, 113, 194)"> ) </EuiTextColor>
      </span>
    </>
  ) : (
    <span className={classNames(paddingLeft, paddingRight)}>
      <FilterContent filter={filter} label={label} />
    </span>
  );
}
