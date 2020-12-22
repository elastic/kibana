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
import React, { Fragment, useContext, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import themeLight from '@elastic/eui/dist/eui_theme_light.json';
import themeDark from '@elastic/eui/dist/eui_theme_dark.json';

import {
  EuiDataGridCellValueElementProps,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';
import { IndexPattern } from '../../../kibana_services';
import { ElasticSearchHit } from '../../doc_views/doc_views_types';
import { DiscoverGridContext } from './discover_grid_context';

export const getRenderCellValueFn = (
  indexPattern: IndexPattern,
  rows: ElasticSearchHit[] | undefined,
  rowsFlattened: Array<Record<string, unknown>>
) => ({ rowIndex, columnId, isDetails, setCellProps }: EuiDataGridCellValueElementProps) => {
  const row = rows ? (rows[rowIndex] as Record<string, unknown>) : undefined;
  const rowFlattened = rowsFlattened
    ? (rowsFlattened[rowIndex] as Record<string, unknown>)
    : undefined;

  const field = indexPattern.fields.getByName(columnId);
  const ctx = useContext(DiscoverGridContext);

  useEffect(() => {
    if (ctx.expanded && row && ctx.expanded._id === row._id) {
      setCellProps({
        style: {
          backgroundColor: ctx.isDarkMode
            ? themeDark.euiColorHighlight
            : themeLight.euiColorHighlight,
        },
      });
    } else {
      setCellProps({ style: undefined });
    }
  }, [ctx, row, setCellProps]);

  if (typeof row === 'undefined' || typeof rowFlattened === 'undefined') {
    return <span>-</span>;
  }

  if (field && field.type === '_source') {
    if (isDetails) {
      // nicely formatted JSON for the expanded view
      return <span>{JSON.stringify(row[columnId], null, 2)}</span>;
    }
    const formatted = indexPattern.formatHit(row);

    return (
      <EuiDescriptionList type="inline" compressed>
        {Object.keys(formatted).map((key) => (
          <Fragment key={key}>
            <EuiDescriptionListTitle>{key}</EuiDescriptionListTitle>
            <EuiDescriptionListDescription dangerouslySetInnerHTML={{ __html: formatted[key] }} />
          </Fragment>
        ))}
      </EuiDescriptionList>
    );
  }

  if (!field?.type && rowFlattened && typeof rowFlattened[columnId] === 'object') {
    if (isDetails) {
      // nicely formatted JSON for the expanded view
      return <span>{JSON.stringify(rowFlattened[columnId], null, 2)}</span>;
    }

    return <span>{JSON.stringify(rowFlattened[columnId])}</span>;
  }

  if (field?.type === 'geo_point' && rowFlattened && rowFlattened[columnId]) {
    const valueFormatted = rowFlattened[columnId] as { lat: number; lon: number };
    return (
      <div>
        {i18n.translate('discover.latitudeAndLongitude', {
          defaultMessage: 'Lat: {lat} Lon: {lon}',
          values: {
            lat: valueFormatted?.lat,
            lon: valueFormatted?.lon,
          },
        })}
      </div>
    );
  }

  const valueFormatted = indexPattern.formatField(row, columnId);
  if (typeof valueFormatted === 'undefined') {
    return <span>-</span>;
  }
  return (
    // eslint-disable-next-line react/no-danger
    <span dangerouslySetInnerHTML={{ __html: indexPattern.formatField(row, columnId) }} />
  );
};
