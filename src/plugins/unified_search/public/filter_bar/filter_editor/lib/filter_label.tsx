/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment } from 'react';
import { EuiTextColor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { existsOperator, isOneOfOperator } from './filter_operators';
import { Filter, FILTERS } from '../../../../../data/common';
import type { FilterLabelStatus } from '../../filter_item';

export interface FilterLabelProps {
  filter: Filter;
  valueLabel?: string;
  filterLabelStatus?: FilterLabelStatus;
}

// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default function FilterLabel({ filter, valueLabel, filterLabelStatus }: FilterLabelProps) {
  const prefixText = filter.meta.negate
    ? ` ${i18n.translate('data.filter.filterBar.negatedFilterPrefix', {
        defaultMessage: 'NOT ',
      })}`
    : '';
  const prefix =
    filter.meta.negate && !filter.meta.disabled ? (
      <EuiTextColor color="danger">{prefixText}</EuiTextColor>
    ) : (
      prefixText
    );

  const getValue = (text?: string) => {
    return <span className="globalFilterLabel__value">{text}</span>;
  };

  if (filter.meta.alias !== null) {
    return (
      <Fragment>
        {prefix}
        {filter.meta.alias}
        {filterLabelStatus && <>: {getValue(valueLabel)}</>}
      </Fragment>
    );
  }

  switch (filter.meta.type) {
    case FILTERS.EXISTS:
      return (
        <Fragment>
          {prefix}
          {filter.meta.key}: {getValue(`${existsOperator.message}`)}
        </Fragment>
      );
    case FILTERS.PHRASES:
      return (
        <Fragment>
          {prefix}
          {filter.meta.key}: {getValue(`${isOneOfOperator.message} ${valueLabel}`)}
        </Fragment>
      );
    case FILTERS.QUERY_STRING:
      return (
        <Fragment>
          {prefix}
          {getValue(`${valueLabel}`)}
        </Fragment>
      );
    case FILTERS.PHRASE:
    case FILTERS.RANGE:
      return (
        <Fragment>
          {prefix}
          {filter.meta.key}: {getValue(valueLabel)}
        </Fragment>
      );
    default:
      return (
        <Fragment>
          {prefix}
          {getValue(`${JSON.stringify(filter.query) || filter.meta.value}`)}
        </Fragment>
      );
  }
}
