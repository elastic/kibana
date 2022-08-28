/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFlexItem, EuiTextColor } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import { FILTERS } from '@kbn/es-query';
import type { LabelOptions } from './filter_badge_utils';
import { existsOperator, isOneOfOperator } from '../../filter_bar/filter_editor';

const FilterBadgeExpressionValue = ({ value }: { value: string | number }) => {
  return (
    <EuiFlexItem grow={false}>
      <EuiTextColor color={typeof value === 'string' ? '#387765' : '#ac4e6d'}>{value}</EuiTextColor>
    </EuiFlexItem>
  );
};

const Prefix = ({ prefix }: { prefix?: boolean }) =>
  prefix ? (
    <EuiFlexItem grow={false}>
      <EuiTextColor color="danger">NOT</EuiTextColor>
    </EuiFlexItem>
  ) : null;

export const FilterContent = ({ filter, label }: { filter: Filter; label: LabelOptions }) => {
  switch (filter.meta.type) {
    case FILTERS.EXISTS:
      return (
        <>
          <Prefix prefix={filter.meta.negate} />
          <EuiFlexItem grow={false}>{filter.meta.key}:</EuiFlexItem>
          <FilterBadgeExpressionValue value={`${existsOperator.message}`} />
        </>
      );
    case FILTERS.PHRASES:
      return (
        <>
          <Prefix prefix={filter.meta.negate} />
          <EuiFlexItem grow={false}>{filter.meta.key}:</EuiFlexItem>
          <FilterBadgeExpressionValue value={`${isOneOfOperator.message} ${label.title}`} />
        </>
      );
    case FILTERS.QUERY_STRING:
      return (
        <>
          <Prefix prefix={filter.meta.negate} /> <FilterBadgeExpressionValue value={label.title} />
        </>
      );
    case FILTERS.PHRASE:
    case FILTERS.RANGE:
      return (
        <>
          <Prefix prefix={filter.meta.negate} />
          <EuiFlexItem grow={false}>{filter.meta.key}:</EuiFlexItem>
          <FilterBadgeExpressionValue value={label.title} />
        </>
      );
    default:
      return (
        <>
          <Prefix prefix={filter.meta.negate} />
          <FilterBadgeExpressionValue
            value={`${JSON.stringify(filter.query) || filter.meta.value}`}
          />
        </>
      );
  }
};
