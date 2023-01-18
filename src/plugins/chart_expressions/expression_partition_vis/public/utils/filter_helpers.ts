/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LayerValue, SeriesIdentifier } from '@elastic/charts';
import { Datatable, DatatableColumn } from '@kbn/expressions-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { ValueClickContext } from '@kbn/embeddable-plugin/public';
import { getFormatByAccessor } from '@kbn/visualizations-plugin/common/utils';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import { BucketColumns, PartitionVisParams } from '../../common/types';
import { FilterEvent } from '../types';

export const canFilter = async (
  event: FilterEvent | null,
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
  metricColId: string,
  visData: Datatable,
  originalVisData: Datatable, // before multiple metrics are consolidated with collapseMetricColumns
  numOriginalMetrics: number,
  splitChartDimension?: DatatableColumn,
  splitChartFormatter?: FieldFormat
): ValueClickContext['data']['data'] => {
  const data: ValueClickContext['data']['data'] = [];
  const rowIndex = visData.rows.findIndex((row) =>
    clickedLayers.every((layer, index) => {
      const columnId = bucketColumns[index].id;
      if (!columnId && !splitChartDimension) return;
      // if there is no column id it means there is no actual bucket column, just the metric column and potentially a split chart column
      const isCurrentLayer = !columnId || row[columnId] === layer.groupByRollup;
      if (!splitChartDimension) {
        return isCurrentLayer;
      }
      const value =
        splitChartFormatter?.convert(row[splitChartDimension.id]) || row[splitChartDimension.id];
      return isCurrentLayer && value === layer.smAccessorValue;
    })
  );

  const originalRowIndex = Math.floor(rowIndex / numOriginalMetrics);

  data.push(
    ...(clickedLayers
      .map((clickedLayer, index) => {
        const currentColumnIndex = visData.columns.findIndex(
          (col) => col.id === bucketColumns[index].id
        );

        if (currentColumnIndex === -1) {
          return undefined;
        }

        const currentColumn = visData.columns[currentColumnIndex];

        // this logic maps the indices of the elements in the
        // visualization's table to the indices in the table before
        // any multiple metrics were collapsed into one metric column
        const originalColumnIndex = currentColumn.meta?.sourceParams?.consolidatedMetricsColumn
          ? currentColumnIndex + (rowIndex % numOriginalMetrics)
          : currentColumnIndex;

        return {
          column: originalColumnIndex,
          row: originalRowIndex,
          value: clickedLayer.groupByRollup,
          table: originalVisData,
        };
      })
      .filter(Boolean) as ValueClickContext['data']['data'])
  );

  // Allows filtering with the small multiples value
  if (splitChartDimension) {
    if (!bucketColumns[0].id) {
      // this is a split chart without any real bucket columns, so filter by the metric column
      data.push({
        column: visData.columns.findIndex((col) => col.id === metricColId),
        row: rowIndex,
        table: visData,
        value: visData.columns.find((col) => col.id === metricColId)?.name,
      });
    }

    data.push({
      column: visData.columns.findIndex((col) => col.id === splitChartDimension.id),
      row: rowIndex,
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

export const getSeriesValueColumnIndex = (value: string, visData: Datatable): number => {
  return visData.columns.findIndex(({ id }) => !!visData.rows.find((r) => r[id] === value));
};

export const getFilterPopoverTitle = (
  visParams: PartitionVisParams,
  visData: Datatable,
  columnIndex: number,
  formatter: FieldFormatsStart,
  seriesKey: string
) => {
  let formattedTitle = '';
  if (visParams.dimensions.buckets) {
    const accessor = visParams.dimensions.buckets[columnIndex];
    formattedTitle =
      formatter
        .deserialize(accessor ? getFormatByAccessor(accessor, visData.columns) : undefined)
        .convert(seriesKey) ?? '';
  }
  return formattedTitle || seriesKey;
};
