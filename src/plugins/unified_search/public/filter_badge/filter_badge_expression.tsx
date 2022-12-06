/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { getDisplayValueFromFilter, getFieldDisplayValueFromFilter } from '@kbn/data-plugin/public';
import type { Filter } from '@kbn/es-query';
import { EuiTextColor, useEuiPaddingCSS } from '@elastic/eui';
import { FilterBadgeGroup } from './filter_badge_group';
import { FilterContent } from './filter_content';
import { getBooleanRelationType } from '../utils';
import { FilterBadgeInvalidPlaceholder } from './filter_badge_invalid';
import { bracketColorCss } from './filter_badge.styles';

export interface FilterBadgeExpressionProps {
  filter: Filter;
  shouldShowBrackets?: boolean;
  dataViews: DataView[];
  filterLabelStatus?: string;
}

interface FilterBadgeContentProps {
  filter: Filter;
  dataViews: DataView[];
  filterLabelStatus?: string;
}

const FilterBadgeContent = ({ filter, dataViews, filterLabelStatus }: FilterBadgeContentProps) => {
  const valueLabel = filterLabelStatus || getDisplayValueFromFilter(filter, dataViews);

  const fieldLabel = getFieldDisplayValueFromFilter(filter, dataViews);

  if (!valueLabel || !filter) {
    return <FilterBadgeInvalidPlaceholder />;
  }

  return (
    <FilterContent
      filter={filter}
      valueLabel={valueLabel}
      fieldLabel={fieldLabel}
      hideAlias={true}
    />
  );
};

export function FilterExpressionBadge({
  filter,
  shouldShowBrackets,
  dataViews,
  filterLabelStatus,
}: FilterBadgeExpressionProps) {
  const paddingLeftCss = useEuiPaddingCSS('left').xs;
  const paddingRightCss = useEuiPaddingCSS('right').xs;

  const conditionalOperationType = getBooleanRelationType(filter);

  return conditionalOperationType ? (
    <>
      {shouldShowBrackets && (
        <span css={paddingLeftCss}>
          <EuiTextColor className={bracketColorCss}>(</EuiTextColor>
        </span>
      )}
      <FilterBadgeGroup
        filters={filter.meta?.params}
        dataViews={dataViews}
        filterLabelStatus={filterLabelStatus}
        booleanRelation={getBooleanRelationType(filter)}
      />
      {shouldShowBrackets && (
        <span css={paddingRightCss}>
          <EuiTextColor className={bracketColorCss}>)</EuiTextColor>
        </span>
      )}
    </>
  ) : (
    <span css={[paddingLeftCss, paddingRightCss]}>
      <FilterBadgeContent
        filter={filter}
        dataViews={dataViews}
        filterLabelStatus={filterLabelStatus}
      />
    </span>
  );
}
