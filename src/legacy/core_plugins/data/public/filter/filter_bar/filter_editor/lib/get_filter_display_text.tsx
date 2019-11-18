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
import { esFilters } from '../../../../../../../../plugins/data/public';

export function getFilterDisplayText(filter: esFilters.Filter, filterDisplayName: string) {
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
    return `${prefix}${filter.meta.alias}`;
  }

  switch (filter.meta.type) {
    case 'exists':
      return (
        <Fragment>
          {prefix}
          {filter.meta.key} {existsOperator.message}
        </Fragment>
      );
    case 'geo_bounding_box':
      return (
        <Fragment>
          {prefix}
          {filter.meta.key}: {filterDisplayName}
        </Fragment>
      );
    case 'geo_polygon':
      return (
        <Fragment>
          {prefix}
          {filter.meta.key}: {filterDisplayName}
        </Fragment>
      );
    case 'phrase':
      return (
        <Fragment>
          {prefix}
          {filter.meta.key}: {filterDisplayName}
        </Fragment>
      );
    case 'phrases':
      return (
        <Fragment>
          {prefix}
          {filter.meta.key} {isOneOfOperator.message} {filterDisplayName}
        </Fragment>
      );
    case 'query_string':
      return (
        <Fragment>
          {prefix}
          {filterDisplayName}
        </Fragment>
      );
    case 'range':
    case 'phrase':
      return (
        <Fragment>
          {prefix}
          {filter.meta.key}: {filterDisplayName}
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
