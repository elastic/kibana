/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { LegendAction, XYChartSeriesIdentifier } from '@elastic/charts';
import { getAccessorByDimension } from '@kbn/visualizations-plugin/common/utils';
import type { FilterEvent } from '../types';
import type { CommonXYDataLayerConfig } from '../../common';
import { LegendActionPopover } from './legend_action_popover';
import {
  DatatablesWithFormatInfo,
  getSeriesName,
  LayersAccessorsTitles,
  LayersFieldFormats,
} from '../helpers';

export const getLegendAction = (
  dataLayers: CommonXYDataLayerConfig[],
  onFilter: (data: FilterEvent['data']) => void,
  fieldFormats: LayersFieldFormats,
  formattedDatatables: DatatablesWithFormatInfo,
  titles: LayersAccessorsTitles
): LegendAction =>
  React.memo(({ series: [xySeries] }) => {
    const series = xySeries as XYChartSeriesIdentifier;
    const layerIndex = dataLayers.findIndex((l) =>
      series.seriesKeys.some((key: string | number) =>
        l.accessors.some(
          (accessor) => getAccessorByDimension(accessor, l.table.columns) === key.toString()
        )
      )
    );

    if (layerIndex === -1) {
      return null;
    }

    const layer = dataLayers[layerIndex];
    if (!layer || !layer.splitAccessors || !layer.splitAccessors.length) {
      return null;
    }

    const { table } = layer;

    const data: FilterEvent['data']['data'] = [];

    series.splitAccessors.forEach((value, accessor) => {
      const rowIndex = table.rows.findIndex((row) => {
        return row[accessor] === value;
      });
      if (rowIndex !== -1) {
        data.push({
          row: rowIndex,
          column: table.columns.findIndex((column) => column.id === accessor),
          value: table.rows[rowIndex][accessor],
          table,
        });
      }
    });

    if (data.length === 0) {
      return null;
    }

    const context: FilterEvent['data'] = {
      data,
    };

    return (
      <LegendActionPopover
        label={
          getSeriesName(
            series,
            {
              splitAccessors: layer.splitAccessors,
              accessorsCount: layer.accessors.length,
              columns: table.columns,
              splitAccessorsFormats: fieldFormats[layer.layerId].splitSeriesAccessors,
              alreadyFormattedColumns: formattedDatatables[layer.layerId].formattedColumns,
              columnToLabelMap: layer.columnToLabel ? JSON.parse(layer.columnToLabel) : {},
            },
            titles
          )?.toString() || ''
        }
        context={context}
        onFilter={onFilter}
      />
    );
  });
