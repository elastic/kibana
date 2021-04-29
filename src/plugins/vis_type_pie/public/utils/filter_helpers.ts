/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LayerValue, SeriesIdentifier } from '@elastic/charts';
import { Datatable, DatatableColumn } from '../../../expressions/public';
import { DataPublicPluginStart, FieldFormat } from '../../../data/public';
import { ClickTriggerEvent } from '../../../charts/public';
import { ValueClickContext } from '../../../embeddable/public';
import { BucketColumns } from '../types';

export const canFilter = async (
  event: ClickTriggerEvent | null,
  actions: DataPublicPluginStart['actions']
): Promise<boolean> => {
  if (!event) {
    return false;
  }
  const filters = await actions.createFiltersFromValueClickAction(event.data);
  return Boolean(filters.length);
};

export const getFilterClickData = (
  clickedLayers: LayerValue[],
  bucketColumns: Array<Partial<BucketColumns>>,
  visData: Datatable,
  splitChartDimension?: DatatableColumn,
  splitChartFormatter?: FieldFormat
): ValueClickContext['data']['data'] => {
  const data: ValueClickContext['data']['data'] = [];
  const matchingIndex = visData.rows.findIndex((row) =>
    clickedLayers.every((layer, index) => {
      const columnId = bucketColumns[index].id;
      if (!columnId) return;
      const isCurrentLayer = row[columnId] === layer.groupByRollup;
      if (!splitChartDimension) {
        return isCurrentLayer;
      }
      const value =
        splitChartFormatter?.convert(row[splitChartDimension.id]) || row[splitChartDimension.id];
      return isCurrentLayer && value === layer.smAccessorValue;
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

  // Allows filtering with the small multiples value
  if (splitChartDimension) {
    data.push({
      column: visData.columns.findIndex((col) => col.id === splitChartDimension.id),
      row: matchingIndex,
      table: visData,
      value: clickedLayers[0].smAccessorValue,
    });
  }

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
