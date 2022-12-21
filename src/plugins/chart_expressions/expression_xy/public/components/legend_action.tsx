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
import { CellValueContext } from '@kbn/embeddable-plugin/public';
import type { LayerCellValueActions, FilterEvent } from '../types';
import type { CommonXYDataLayerConfig } from '../../common';
import { LegendActionPopover, LegendCellValueActions } from './legend_action_popover';
import {
  DatatablesWithFormatInfo,
  getSeriesName,
  hasMultipleLayersWithSplits,
  LayersAccessorsTitles,
  LayersFieldFormats,
} from '../helpers';

export const getLegendAction = (
  dataLayers: CommonXYDataLayerConfig[],
  onFilter: (data: FilterEvent['data']) => void,
  layerCellValueActions: LayerCellValueActions,
  fieldFormats: LayersFieldFormats,
  formattedDatatables: DatatablesWithFormatInfo,
  titles: LayersAccessorsTitles,
  singleTable?: boolean
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
    const allYAccessors = dataLayers.flatMap((dataLayer) => dataLayer.accessors);

    if (layerIndex === -1) {
      return null;
    }

    const layer = dataLayers[layerIndex];
    if (!layer || !layer.splitAccessors || !layer.splitAccessors.length) {
      return null;
    }

    const { table } = layer;

    const filterActionData: FilterEvent['data']['data'] = [];
    const cellValueActionData: CellValueContext['data'] = [];

    series.splitAccessors.forEach((value, accessor) => {
      const rowIndex = formattedDatatables[layer.layerId].table.rows.findIndex((row) => {
        return row[accessor] === value;
      });
      const columnIndex = table.columns.findIndex((column) => column.id === accessor);

      if (rowIndex >= 0 && columnIndex >= 0) {
        filterActionData.push({
          row: rowIndex,
          column: columnIndex,
          value: table.rows[rowIndex][accessor],
          table,
        });

        cellValueActionData.push({
          value: table.rows[rowIndex][accessor],
          columnMeta: table.columns[columnIndex].meta,
        });
      }
    });

    if (filterActionData.length === 0) {
      return null;
    }

    const filterHandler = ({ negate }: { negate?: boolean } = {}) => {
      onFilter({ data: filterActionData, negate });
    };

    const legendCellValueActions: LegendCellValueActions =
      layerCellValueActions[layerIndex]?.map((action) => ({
        ...action,
        execute: () => action.execute(cellValueActionData),
      })) ?? [];

    return (
      <LegendActionPopover
        label={
          getSeriesName(
            series,
            {
              splitAccessors: layer.splitAccessors,
              accessorsCount: singleTable ? allYAccessors.length : layer.accessors.length,
              columns: table.columns,
              splitAccessorsFormats: fieldFormats[layer.layerId].splitSeriesAccessors,
              alreadyFormattedColumns: formattedDatatables[layer.layerId].formattedColumns,
              columnToLabelMap: layer.columnToLabel ? JSON.parse(layer.columnToLabel) : {},
              multipleLayersWithSplits: hasMultipleLayersWithSplits(dataLayers),
            },
            titles
          )?.toString() || ''
        }
        onFilter={filterHandler}
        legendCellValueActions={legendCellValueActions}
      />
    );
  });
