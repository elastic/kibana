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
import React, { useContext } from 'react';
import { EuiButtonEmpty, EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IndexPatternField } from '../../../../../data/common/index_patterns/fields';
import { DiscoverGridContext } from './discover_grid_context';

export const FilterInBtn = ({
  Component,
  rowIndex,
  columnId,
}: {
  Component: typeof EuiButtonEmpty | typeof EuiButtonIcon;
  rowIndex: number;
  columnId: string;
}) => {
  const context = useContext(DiscoverGridContext);
  return (
    <Component
      onClick={() => {
        const row = context.rows[rowIndex];
        const flattened = context.indexPattern.flattenHit(row);

        if (flattened) {
          context.onFilter(columnId, flattened[columnId], '+');
        }
      }}
      iconType="plusInCircle"
      aria-label={i18n.translate('discover.grid.filterForAria', {
        defaultMessage: 'Filter for {value}',
        values: { value: columnId },
      })}
      data-test-subj="filterForButton"
    >
      {i18n.translate('discover.grid.filterFor', {
        defaultMessage: 'Filter for',
      })}
    </Component>
  );
};

export const FilterOutBtn = ({
  Component,
  rowIndex,
  columnId,
}: {
  Component: typeof EuiButtonEmpty | typeof EuiButtonIcon;
  rowIndex: number;
  columnId: string;
}) => {
  const context = useContext(DiscoverGridContext);
  return (
    <Component
      onClick={() => {
        const row = context.rows[rowIndex];
        const flattened = context.indexPattern.flattenHit(row);

        if (flattened) {
          context.onFilter(columnId, flattened[columnId], '-');
        }
      }}
      iconType="minusInCircle"
      aria-label={i18n.translate('discover.grid.filterOutAria', {
        defaultMessage: 'Filter out {value}',
        values: { value: columnId },
      })}
      data-test-subj="filterOutButton"
    >
      {i18n.translate('discover.grid.filterOut', {
        defaultMessage: 'Filter out',
      })}
    </Component>
  );
};

export function buildCellActions(field: IndexPatternField) {
  if (!field.aggregatable) {
    return undefined;
  }

  return [FilterInBtn, FilterOutBtn];
}
