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
import { i18n } from '@kbn/i18n';
import { EuiScreenReaderOnly } from '@elastic/eui';
import { DiscoverGridSelectButton } from './discover_grid_doc_selection';
import { ViewButton } from './discover_grid_view_button';
import { ElasticSearchHit } from '../../doc_views/doc_views_types';

export function leadControlColumns(rows: ElasticSearchHit[] | undefined, useDocSelector: boolean) {
  if (!rows) {
    return [];
  }
  return [
    useDocSelector
      ? {
          id: 'checkBox',
          width: 31,
          headerCellRender: () => (
            <EuiScreenReaderOnly>
              <span>
                {i18n.translate('discover.selectColumnHeader', {
                  defaultMessage: 'Select column',
                })}
              </span>
            </EuiScreenReaderOnly>
          ),
          rowCellRender: (col: number) => <DiscoverGridSelectButton col={col} rows={rows} />,
          cellActions: [],
        }
      : null,
    {
      id: 'openDetails',
      width: 31,
      headerCellRender: () => (
        <EuiScreenReaderOnly>
          <span>
            {i18n.translate('discover.controlColumnHeader', {
              defaultMessage: 'Control column',
            })}
          </span>
        </EuiScreenReaderOnly>
      ),
      rowCellRender: ViewButton,
      cellActions: [],
    },
  ].filter((obj) => !!obj);
}
