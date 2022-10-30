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
import { existsOperator, isOneOfOperator } from '../../filter_bar/filter_editor';

const FilterValue = ({ value }: { value: string | number }) => {
  return (
    <EuiTextColor color={typeof value === 'string' ? 'success' : 'accent'}> {value}</EuiTextColor>
  );
};

const FilterField = ({
  filter,
  fieldLabel,
}: {
  filter: Filter;
  fieldLabel?: string | undefined;
}) => {
  return (
    <>
      <Prefix prefix={filter.meta.negate} />
      {fieldLabel || filter.meta.key}:
    </>
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

export interface FilterContentProps {
  filter: Filter;
  valueLabel: string;
  fieldLabel?: string;
}

function FilterContent({ filter, valueLabel, fieldLabel }: FilterContentProps) {
  switch (filter.meta.type) {
    case FILTERS.EXISTS:
      return (
        <>
          <FilterField filter={filter} fieldLabel={fieldLabel} />
          <FilterValue value={`${existsOperator.message}`} />
        </>
      );
    case FILTERS.PHRASES:
      return (
        <>
          <FilterField filter={filter} fieldLabel={fieldLabel} />
          <FilterValue value={`${isOneOfOperator.message} ${valueLabel}`} />
        </>
      );
    case FILTERS.QUERY_STRING:
      return (
        <>
          <Prefix prefix={filter.meta.negate} /> <FilterValue value={valueLabel} />
        </>
      );
    case FILTERS.PHRASE:
    case FILTERS.RANGE:
      return (
        <>
          <FilterField filter={filter} fieldLabel={fieldLabel} />
          <FilterValue value={valueLabel} />
        </>
      );
    default:
      return (
        <>
          <Prefix prefix={filter.meta.negate} />
          <FilterValue value={`${JSON.stringify(filter.query) || filter.meta.value}`} />
        </>
      );
  }
}

// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default FilterContent;
