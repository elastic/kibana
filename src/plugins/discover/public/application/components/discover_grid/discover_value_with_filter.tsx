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
import React, { ReactNode } from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DocViewFilterFn, ElasticSearchHit } from '../../doc_views/doc_views_types';
import { IndexPattern } from '../../../../../data/common/index_patterns/index_patterns';

/**
 * Draft component displaying filter lens icons on hover with the possibility to add a filter
 */
export const DiscoverGridValueWithFilter = ({
  value,
  columnId,
  row,
  indexPattern,
  onFilter,
}: {
  value: ReactNode;
  columnId: string;
  row: ElasticSearchHit;
  indexPattern: IndexPattern;
  onFilter: DocViewFilterFn;
}) => {
  return (
    <EuiFlexGroup
      direction="row"
      gutterSize="none"
      alignItems="center"
      responsive={false}
      className="eui-textTruncate dscEuiDataGridRowCellWithFilter"
    >
      <EuiFlexItem className="eui-textTruncate" grow={false}>
        {value}
      </EuiFlexItem>
      <EuiFlexItem className="dscEuiDataGridRowCellFilter">
        <div>
          <EuiButtonIcon
            className="dscEuiDataGridRowCellBtn"
            iconSize="s"
            iconType="plusInCircle"
            aria-label={i18n.translate('discover.grid.ariaFilterOn', {
              defaultMessage: 'Filter on {value}',
              values: { value: columnId },
            })}
            onClick={(ev: React.MouseEvent<HTMLButtonElement>) => {
              ev.stopPropagation();
              ev.preventDefault();
              onFilter(
                indexPattern.fields.getByName(columnId),
                indexPattern.flattenHit(row)[columnId],
                '+'
              );
            }}
          />
          <EuiButtonIcon
            className="dscEuiDataGridRowCellBtn"
            iconSize="s"
            iconType="minusInCircle"
            aria-label={i18n.translate('discover.grid.ariaFilterOut', {
              defaultMessage: 'Filter out {value}',
              values: { value: columnId },
            })}
            onClick={(ev: React.MouseEvent<HTMLButtonElement>) => {
              ev.stopPropagation();
              ev.preventDefault();
              onFilter(
                indexPattern.fields.getByName(columnId),
                indexPattern.flattenHit(row)[columnId],
                '-'
              );
            }}
          />
        </div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
