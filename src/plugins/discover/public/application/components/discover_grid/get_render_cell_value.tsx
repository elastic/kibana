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
import { EuiDataGridCellValueElementProps } from '@elastic/eui';
import { DiscoverGridPopover } from './discover_grid_popover';
import { IndexPattern } from '../../../kibana_services';
import { DocViewFilterFn, ElasticSearchHit } from '../../doc_views/doc_views_types';

export const getRenderCellValueFn = (
  indexPattern: IndexPattern,
  rows: ElasticSearchHit[] | undefined,
  onFilter: DocViewFilterFn
) => ({ rowIndex, columnId, isDetails }: EuiDataGridCellValueElementProps) => {
  const row = rows ? rows[rowIndex] : undefined;

  if (typeof row === 'undefined') {
    return '-';
  }
  const field = indexPattern.fields.getByName(columnId);
  const formatSource = () => {
    const formatted = indexPattern.formatHit(row);

    return (
      <dl className="dscFormatSource">
        {Object.keys(formatted).map((key) => (
          <span key={key}>
            <dt className="dscFormatSource__title">{key}</dt>
            <dd
              className="dscFormatSource__description"
              /* eslint-disable-next-line react/no-danger */
              dangerouslySetInnerHTML={{ __html: formatted[key] }}
            />
          </span>
        ))}
      </dl>
    );
  };
  // TODO Field formatters need to be fixed
  const value =
    field && field.type === '_source' ? (
      formatSource()
    ) : (
      // eslint-disable-next-line react/no-danger
      <span dangerouslySetInnerHTML={{ __html: indexPattern.formatField(row, columnId) }} />
    );

  if (isDetails && indexPattern.fields.getByName(columnId)?.filterable) {
    const createFilter = (fieldName: string, type: '-' | '+') => {
      return onFilter(
        indexPattern.fields.getByName(fieldName),
        indexPattern.flattenHit(row)[fieldName],
        type
      );
    };

    return (
      <DiscoverGridPopover
        value={value}
        onPositiveFilterClick={() => createFilter(columnId, '+')}
        onNegativeFilterClick={() => createFilter(columnId, '-')}
      />
    );
  } else if (indexPattern.fields.getByName(columnId)?.filterable) {
    return value;
  }
  return value;
};
