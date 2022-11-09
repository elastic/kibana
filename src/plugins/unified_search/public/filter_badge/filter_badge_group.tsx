/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import type { Filter, BooleanRelation } from '@kbn/es-query';
import { EuiTextColor, useEuiTheme } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import { css } from '@emotion/css';
import { FilterBadgeErrorBoundary } from './filter_badge_error_boundary';
import { FilterExpressionBadge } from './filter_badge_expression';

export interface FilterBadgeGroupProps {
  filters: Filter[];
  dataViews: DataView[];
  filterLabelStatus?: string;
  booleanRelation?: BooleanRelation;
}

const BooleanRelationDelimiter = ({ conditional }: { conditional: BooleanRelation }) => {
  const { euiTheme } = useEuiTheme();
  const bracketColor = useMemo(
    () => css`
      color: ${euiTheme.colors.primary};
    `,
    [euiTheme.colors.primary]
  );

  return <EuiTextColor className={bracketColor}>{conditional}</EuiTextColor>;
};

export function FilterBadgeGroup({
  filters,
  dataViews,
  filterLabelStatus,
  booleanRelation,
}: FilterBadgeGroupProps) {
  return (
    <FilterBadgeErrorBoundary>
      {filters.map((filter, index, arrayRef) => (
        <>
          <FilterExpressionBadge
            filter={filter}
            shouldShowBrackets={arrayRef.length > 1}
            dataViews={dataViews}
            filterLabelStatus={filterLabelStatus}
          />
          {booleanRelation && index + 1 < arrayRef.length ? (
            <BooleanRelationDelimiter conditional={booleanRelation} />
          ) : null}
        </>
      ))}
    </FilterBadgeErrorBoundary>
  );
}

// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default FilterBadgeGroup;
