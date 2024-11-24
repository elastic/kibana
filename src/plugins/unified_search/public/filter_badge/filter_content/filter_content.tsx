/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiTextColor, useEuiTheme } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import { FILTERS } from '@kbn/es-query';
import { css } from '@emotion/react';
import { existsOperator, isOneOfOperator } from '../../filter_bar/filter_editor';
import { strings } from '../i18n';

const FilterValue = ({ value, operator }: { value?: string | number; operator?: string }) => {
  const { euiTheme } = useEuiTheme();
  const operatorStyles = css`
    font-weight: ${euiTheme.font.weight.medium};
    color: ${euiTheme.colors.textPrimary};
  `;
  const valueFontWeight = css`
    font-weight: ${euiTheme.font.weight.regular};
  `;

  return (
    <>
      {operator ? (
        <EuiTextColor color="primary" css={operatorStyles} className="globalFilterLabel__value">
          {` ${operator}`}
        </EuiTextColor>
      ) : null}
      {value ? (
        <EuiTextColor color="success" css={valueFontWeight} className="globalFilterLabel__value">
          {` ${value}`}
        </EuiTextColor>
      ) : null}
    </>
  );
};

const FilterField = ({
  filter,
  fieldLabel,
}: {
  filter: Filter;
  fieldLabel?: string | undefined;
}) => {
  const { euiTheme } = useEuiTheme();
  const fontWeight = css`
    font-weight: ${euiTheme.font.weight.medium};
  `;

  return (
    <>
      <Prefix prefix={filter.meta.negate} />
      <EuiTextColor css={fontWeight}>{fieldLabel || filter.meta.key}:</EuiTextColor>
    </>
  );
};

const Prefix = ({ prefix }: { prefix?: boolean }) => {
  const { euiTheme } = useEuiTheme();
  const fontWeight = css`
    font-weight: ${euiTheme.font.weight.medium};
  `;

  return prefix ? (
    <EuiTextColor color="danger" css={fontWeight}>
      {strings.getNotLabel()}
    </EuiTextColor>
  ) : null;
};

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
          <FilterValue operator={existsOperator.message} />
        </>
      );
    case FILTERS.PHRASES:
      return (
        <>
          <FilterField filter={filter} fieldLabel={fieldLabel} />
          <FilterValue operator={isOneOfOperator.message} value={valueLabel} />
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
