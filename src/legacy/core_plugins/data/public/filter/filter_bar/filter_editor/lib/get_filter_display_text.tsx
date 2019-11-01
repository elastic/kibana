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

import React from 'react';
import { EuiTextColor } from '@elastic/eui';
import { Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { existsOperator, isOneOfOperator } from './filter_operators';

export function getFilterDisplayText(filter: Filter, filterDisplayName: string) {
  const prefixText = filter.meta.negate
    ? ` ${i18n.translate('data.filter.filterBar.negatedFilterPrefix', {
        defaultMessage: 'NOT ',
      })}`
    : '';
  const prefix = <EuiTextColor color="danger">{prefixText}</EuiTextColor>;

  if (filter.meta.alias !== null) {
    return `${prefix}${filter.meta.alias}`;
  }

  switch (filter.meta.type) {
    case 'exists':
      return (
        <span>
          {prefix}
          {existsOperator.message}
        </span>
      );
    case 'geo_bounding_box':
      return (
        <span>
          {prefix}
          {filter.meta.key}: {filterDisplayName}
        </span>
      );
    case 'geo_polygon':
      return (
        <span>
          {prefix}
          {filter.meta.key}: {filterDisplayName}
        </span>
      );
    case 'phrase':
      return (
        <span>
          {prefix}
          {filter.meta.key}: {filterDisplayName}
        </span>
      );
    case 'phrases':
      return (
        <span>
          {prefix}
          {filter.meta.key} {isOneOfOperator.message} {filterDisplayName}
        </span>
      );
    case 'query_string':
      return (
        <span>
          {prefix}
          {filterDisplayName}
        </span>
      );
    case 'range':
    case 'phrase':
      return (
        <span>
          {prefix}
          {filter.meta.key}: {filterDisplayName}
        </span>
      );
    default:
      return (
        <span>
          {prefix}
          {JSON.stringify(filter.query)}
        </span>
      );
  }
}
