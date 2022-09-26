/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiTextColor } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import { FILTERS } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import type { LabelOptions } from './filter_badge_utils';
import { existsOperator, isOneOfOperator } from '../filter_bar/filter_editor';

const FilterBadgeExpressionValue = ({ value }: { value: string | number }) => {
  return (
    <EuiTextColor color={typeof value === 'string' ? '#387765' : '#ac4e6d'}> {value}</EuiTextColor>
  );
};

const Prefix = ({ prefix }: { prefix?: boolean }) =>
  prefix ? (
    <EuiTextColor color="danger">
      {i18n.translate('unifiedSearch.filter.filterBar.negatedFilterPrefix', {
        defaultMessage: 'NOT ',
      })}
    </EuiTextColor>
  ) : null;

export const FilterContent = ({ filter, label }: { filter: Filter; label: LabelOptions }) => {
  switch (filter.meta.type) {
    case FILTERS.EXISTS:
      return (
        <>
          <Prefix prefix={filter.meta.negate} />
          {filter.meta.key}:
          <FilterBadgeExpressionValue value={`${existsOperator.message}`} />
        </>
      );
    case FILTERS.PHRASES:
      return (
        <>
          <Prefix prefix={filter.meta.negate} />
          {filter.meta.key}:
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
          {filter.meta.key}:
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
