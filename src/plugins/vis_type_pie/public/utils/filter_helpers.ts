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
import { LayerValue, SeriesIdentifier } from '@elastic/charts';
import { Datatable } from '../../../expressions/public';
import { ValueClickContext } from '../../../embeddable/public';
import { ClickTriggerEvent } from './get_legend_actions';
import { getDataActions } from '../services';
import { BucketColumns } from '../types';

export const canFilter = async (event: ClickTriggerEvent | null): Promise<boolean> => {
  if (!event) {
    return false;
  }
  const filters = await getDataActions().createFiltersFromValueClickAction(event.data);
  return Boolean(filters.length);
};

export const getFilterClickData = (
  clickedLayers: LayerValue[],
  bucketColumns: Array<Partial<BucketColumns>>,
  visData: Datatable
): ValueClickContext['data']['data'] => {
  const data: ValueClickContext['data']['data'] = [];
  const matchingIndex = visData.rows.findIndex((row) =>
    clickedLayers.every((layer, index) => {
      const columnId = bucketColumns[index].id;
      if (!columnId) return;
      return row[columnId] === layer.groupByRollup;
    })
  );

  data.push(
    ...clickedLayers.map((clickedLayer, index) => ({
      column: visData.columns.findIndex((col) => col.id === bucketColumns[index].id),
      row: matchingIndex,
      value: clickedLayer.groupByRollup,
      table: visData,
    }))
  );

  return data;
};

export const getFilterEventData = (
  visData: Datatable,
  series: SeriesIdentifier
): ValueClickContext['data']['data'] => {
  return visData.columns.reduce<ValueClickContext['data']['data']>((acc, { id }, column) => {
    const value = series.key;
    const row = visData.rows.findIndex((r) => r[id] === value);
    if (row > -1) {
      acc.push({
        table: visData,
        column,
        row,
        value,
      });
    }

    return acc;
  }, []);
};
