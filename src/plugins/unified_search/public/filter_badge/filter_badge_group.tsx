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
import { EuiTextColor } from '@elastic/eui';
import { FilterExpressionBadge } from './filter_badge_expression';
import { ConditionTypes } from '../utils';

export interface FilterBadgeGroupProps {
  filters: Filter[];
  dataView: DataView;
  conditionType?: ConditionTypes;
}

const ConditionalTypeDelimiter = ({ conditional }: { conditional: ConditionTypes }) => {
  return <EuiTextColor color="rgb(0, 113, 194)">{conditional}</EuiTextColor>;
};

export function FilterBadgeGroup({ filters, dataView, conditionType }: FilterBadgeGroupProps) {
  return (
    <>
      {filters.map((filter, index, acc) => (
        <>
          <FilterExpressionBadge filter={filter} dataView={dataView} />
          {conditionType && index + 1 < acc.length ? (
            <ConditionalTypeDelimiter conditional={conditionType} />
          ) : null}
        </>
      ))}
    </>
  );
}
