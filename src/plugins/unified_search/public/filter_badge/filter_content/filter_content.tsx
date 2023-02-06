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
import { existsOperator, isOneOfOperator } from '../../filter_bar/filter_editor';
import { strings } from '../i18n';

const FilterValue = ({ value }: { value: string | number }) => {
  return (
    <EuiTextColor
      color={typeof value === 'string' ? 'success' : 'accent'}
      className="globalFilterLabel__value"
    >
      {` ${value}`}
    </EuiTextColor>
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
  prefix ? <EuiTextColor color="danger">{strings.getNotLabel()}</EuiTextColor> : null;

export interface FilterContentProps {
  filter: Filter;
  valueLabel: string;
  fieldLabel?: string;
  hideAlias?: boolean;
}

export function FilterContent({ filter, valueLabel, fieldLabel, hideAlias }: FilterContentProps) {
  if (!hideAlias && filter.meta.alias !== null) {
    return (
      <>
        <Prefix prefix={filter.meta.negate} />
        <FilterValue value={`${filter.meta.alias}`} />
      </>
    );
  }

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
