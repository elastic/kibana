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

import { EuiBadge } from '@elastic/eui';
import { Filter, isFilterPinned } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import React, { SFC } from 'react';
import { existsOperator, isOneOfOperator } from '../filter_editor/lib/filter_operators';

interface Props {
  filter: Filter;
  [propName: string]: any;
}

export const FilterView: SFC<Props> = ({ filter, ...rest }: Props) => {
  let title = `Filter: ${getFilterDisplayText(filter)}. ${i18n.translate(
    'data.filter.filterBar.moreFilterActionsMessage',
    {
      defaultMessage: 'Select for more filter actions.',
    }
  )}`;

  if (isFilterPinned(filter)) {
    title = `${i18n.translate('data.filter.filterBar.pinnedFilterPrefix', {
      defaultMessage: 'Pinned',
    })} ${title}`;
  }
  if (filter.meta.disabled) {
    title = `${i18n.translate('data.filter.filterBar.disabledFilterPrefix', {
      defaultMessage: 'Disabled',
    })} ${title}`;
  }

  return (
    <EuiBadge
      title={title}
      iconType="cross"
      // @ts-ignore
      iconSide="right"
      closeButtonProps={{
        // Removing tab focus on close button because the same option can be optained through the context menu
        // Also, we may want to add a `DEL` keyboard press functionality
        tabIndex: '-1',
      }}
      iconOnClickAriaLabel={i18n.translate('data.filter.filterBar.filterItemBadgeIconAriaLabel', {
        defaultMessage: 'Delete',
      })}
      onClickAriaLabel={i18n.translate('data.filter.filterBar.filterItemBadgeAriaLabel', {
        defaultMessage: 'Filter actions',
      })}
      {...rest}
    >
      <span>{getFilterDisplayText(filter)}</span>
    </EuiBadge>
  );
};

export function getFilterDisplayText(filter: Filter) {
  const prefix = filter.meta.negate
    ? ` ${i18n.translate('data.filter.filterBar.negatedFilterPrefix', {
        defaultMessage: 'NOT ',
      })}`
    : '';

  if (filter.meta.alias !== null) {
    return `${prefix}${filter.meta.alias}`;
  }

  switch (filter.meta.type) {
    case 'exists':
      return `${prefix}${filter.meta.key} ${existsOperator.message}`;
    case 'geo_bounding_box':
      return `${prefix}${filter.meta.key}: ${filter.meta.value}`;
    case 'geo_polygon':
      return `${prefix}${filter.meta.key}: ${filter.meta.value}`;
    case 'phrase':
      return `${prefix}${filter.meta.key}: ${filter.meta.value}`;
    case 'phrases':
      return `${prefix}${filter.meta.key} ${isOneOfOperator.message} ${filter.meta.value}`;
    case 'query_string':
      return `${prefix}${filter.meta.value}`;
    case 'range':
      return `${prefix}${filter.meta.key}: ${filter.meta.value}`;
    default:
      return `${prefix}${JSON.stringify(filter.query)}`;
  }
}
