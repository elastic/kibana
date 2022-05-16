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
import type { FormatFactory } from '../types';
import { LegendActionPopover } from './legend_action_popover';
import { DatatablesWithFormatInfo, getFormat } from '../helpers';

export const getLegendAction = (
  dataLayers: CommonXYDataLayerConfig[],
  onFilter: (data: FilterEvent['data']) => void,
  formatFactory: FormatFactory,
  formattedDatatables: DatatablesWithFormatInfo
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
    if (!layer || !layer.splitAccessor) {
      return null;
    }

    const splitLabel = series.seriesKeys[0] as string;

    const { table } = layer;
    const accessor = getAccessorByDimension(layer.splitAccessor, table.columns);
    const formatter = formatFactory(
      accessor ? getFormat(table.columns, layer.splitAccessor) : undefined
    );

    const rowIndex = table.rows.findIndex((row) => {
      if (formattedDatatables[layer.layerId]?.formattedColumns[accessor]) {
        // stringify the value to compare with the chart value
        return formatter.convert(row[accessor]) === splitLabel;
      }
      return row[accessor] === splitLabel;
    });

    if (rowIndex < 0) return null;

    const data = [
      {
        row: rowIndex,
        column: table.columns.findIndex((col) => col.id === accessor),
        value: accessor ? table.rows[rowIndex][accessor] : splitLabel,
        table,
      },
    ];

    const context: FilterEvent['data'] = {
      data,
    };

    return (
      <LegendActionPopover
        label={
          !formattedDatatables[layer.layerId]?.formattedColumns[accessor] && formatter
            ? formatter.convert(splitLabel)
            : splitLabel
        }
        context={context}
        onFilter={onFilter}
      />
    );
  });
