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
import { css } from '@emotion/css';
import { FilterExpressionBadge } from './filter_badge_expression';

export interface FilterBadgeGroupProps {
  filters: Filter[];
  booleanRelation?: BooleanRelation;
  isRootLevel?: boolean;
}

const BooleanRelationDelimiter = ({ conditional }: { conditional: BooleanRelation }) => {
  const { euiTheme } = useEuiTheme();
  const bracketСolor = useMemo(
    () => css`
      color: ${euiTheme.colors.primary};
    `,
    [euiTheme.colors.primary]
  );

  return <EuiTextColor className={bracketСolor}>{conditional}</EuiTextColor>;
};

export function FilterBadgeGroup({ filters, booleanRelation, isRootLevel }: FilterBadgeGroupProps) {
  return (
    <>
      {filters.map((filter, index, acc) => (
        <>
          <FilterExpressionBadge filter={filter} isRootLevel={isRootLevel} />
          {booleanRelation && index + 1 < acc.length ? (
            <BooleanRelationDelimiter conditional={booleanRelation} />
          ) : null}
        </>
      ))}
    </>
  );
}
