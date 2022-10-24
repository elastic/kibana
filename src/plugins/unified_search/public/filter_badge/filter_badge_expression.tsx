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
import type { BooleanRelation } from '@kbn/es-query';
import { EuiTextColor, useEuiPaddingCSS, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { FilterBadgeGroup } from './filter_badge_group';
import type { LabelOptions } from './filter_badge_utils';
import { FILTER_LABLE_STATUS, getValueLabel } from './filter_badge_utils';
import { FilterContent } from './filter_badge_expression_filter_content';
import { getConditionalOperationType } from '../utils';

export interface FilterBadgeExpressionProps {
  filter: Filter;
  dataViews: DataView[];
  conditionType?: BooleanRelation;
  isRootLevel?: boolean;
}

export function FilterExpressionBadge({
  filter,
  dataViews,
  isRootLevel,
}: FilterBadgeExpressionProps) {
  const conditionalOperationType = getConditionalOperationType(filter);

  const paddingLeft = useEuiPaddingCSS('left').xs;
  const paddingRight = useEuiPaddingCSS('right').xs;

  const { euiTheme } = useEuiTheme();

  const bracketСolor = useMemo(
    () => css`
      color: ${euiTheme.colors.primary};
    `,
    [euiTheme.colors.primary]
  );

  let label: LabelOptions = {
    title: '',
    message: '',
    status: FILTER_LABLE_STATUS.FILTER_ITEM_OK,
  };

  if (!conditionalOperationType) {
    label = getValueLabel(filter, dataViews);
  }

  return conditionalOperationType ? (
    <>
      {!isRootLevel ? (
        <span css={paddingLeft}>
          <EuiTextColor className={bracketСolor}>(</EuiTextColor>
        </span>
      ) : null}
      <FilterBadgeGroup
        filters={Array.isArray(filter) ? filter : filter.meta?.params}
        dataViews={dataViews}
        conditionType={conditionalOperationType}
      />
      {!isRootLevel ? (
        <span css={paddingRight}>
          <EuiTextColor className={bracketСolor}>)</EuiTextColor>
        </span>
      ) : null}
    </>
  ) : (
    <span css={[paddingLeft, paddingRight]}>
      <FilterContent filter={filter} label={label} />
    </span>
  );
}
