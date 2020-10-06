/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { Fragment } from 'react';
import { EuiTextColor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { existsOperator, isOneOfOperator } from './filter_operators';
import { Filter, FILTERS } from '../../../../../common';
import type { FilterLabelStatus } from '../../filter_item';

// @internal
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
    case FILTERS.GEO_BOUNDING_BOX:
      return (
        <Fragment>
          {prefix}
          {filter.meta.key}: {getValue(valueLabel)}
        </Fragment>
      );
    case FILTERS.GEO_POLYGON:
      return (
        <Fragment>
          {prefix}
          {filter.meta.key}: {getValue(valueLabel)}
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
