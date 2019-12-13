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
import { esFilters } from '../../../..';

interface Props {
  filter: esFilters.Filter;
  valueLabel?: string;
}

export function FilterLabel({ filter, valueLabel }: Props) {
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

  if (filter.meta.alias !== null) {
    return (
      <Fragment>
        {prefix}
        {filter.meta.alias}
      </Fragment>
    );
  }

  switch (filter.meta.type) {
    case esFilters.FILTERS.EXISTS:
      return (
        <Fragment>
          {prefix}
          {filter.meta.key} {existsOperator.message}
        </Fragment>
      );
    case esFilters.FILTERS.GEO_BOUNDING_BOX:
      return (
        <Fragment>
          {prefix}
          {filter.meta.key}: {valueLabel}
        </Fragment>
      );
    case esFilters.FILTERS.GEO_POLYGON:
      return (
        <Fragment>
          {prefix}
          {filter.meta.key}: {valueLabel}
        </Fragment>
      );
    case esFilters.FILTERS.PHRASES:
      return (
        <Fragment>
          {prefix}
          {filter.meta.key} {isOneOfOperator.message} {valueLabel}
        </Fragment>
      );
    case esFilters.FILTERS.QUERY_STRING:
      return (
        <Fragment>
          {prefix}
          {valueLabel}
        </Fragment>
      );
    case esFilters.FILTERS.PHRASE:
    case esFilters.FILTERS.RANGE:
      return (
        <Fragment>
          {prefix}
          {filter.meta.key}: {valueLabel}
        </Fragment>
      );
    default:
      return (
        <Fragment>
          {prefix}
          {JSON.stringify(filter.query)}
        </Fragment>
      );
  }
}
