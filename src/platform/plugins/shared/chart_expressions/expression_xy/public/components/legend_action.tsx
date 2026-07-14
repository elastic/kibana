/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { LegendAction, XYChartSeriesIdentifier } from '@elastic/charts';
import type { LayerCellValueActions } from '../types';
import type { CommonXYDataLayerConfig } from '../../common';
import type { LegendCellValueActions } from './legend_action_popover';
import { LegendActionPopover } from './legend_action_popover';
import type {
  DatatablesWithFormatInfo,
  LayersAccessorsTitles,
  LayersFieldFormats,
} from '../helpers';
import { getSeriesName, hasMultipleLayersWithSplits, getLegendSeriesFilterData } from '../helpers';

export const getLegendAction = (
  dataLayers: CommonXYDataLayerConfig[],
  // Same callback direct legend item clicks dispatch through (see `filterBySeries` in xy_chart.tsx),
  // so "Filter for"/"Filter out" and a raw legend click always resolve to the same filter.
  onFilter: (series: XYChartSeriesIdentifier, negate?: boolean) => void,
  layerCellValueActions: LayerCellValueActions,
  fieldFormats: LayersFieldFormats,
  formattedDatatables: DatatablesWithFormatInfo,
  titles: LayersAccessorsTitles,
  singleTable?: boolean
): LegendAction =>
  React.memo(({ series: [xySeries] }) => {
    const series = xySeries as XYChartSeriesIdentifier;
    const allYAccessors = dataLayers.flatMap((dataLayer) => dataLayer.accessors);

    const seriesFilterData = getLegendSeriesFilterData(series, dataLayers, formattedDatatables);

    if (!seriesFilterData) {
      return null;
    }

    const { layerIndex, cellValueActionData, isFilterable, warningMessage } = seriesFilterData;

    const layer = dataLayers[layerIndex];
    if (!layer?.splitAccessors?.length) {
      return null;
    }

    const filterHandler = ({ negate }: { negate?: boolean } = {}) => {
      if (isFilterable) {
        onFilter(series, negate);
      }
    };

    const legendCellValueActions: LegendCellValueActions =
      layerCellValueActions[layerIndex]?.map((action) => ({
        ...action,
        execute: () => action.execute(cellValueActionData),
      })) ?? [];

    const label =
      getSeriesName(
        series,
        {
          splitAccessors: layer.splitAccessors,
          accessorsCount: singleTable ? allYAccessors.length : layer.accessors.length,
          columns: layer.table.columns,
          splitAccessorsFormats: fieldFormats[layer.layerId].splitSeriesAccessors,
          alreadyFormattedColumns: formattedDatatables[layer.layerId].formattedColumns,
          columnToLabelMap: layer.columnToLabel ? JSON.parse(layer.columnToLabel) : {},
          multipleLayersWithSplits: hasMultipleLayersWithSplits(dataLayers),
        },
        titles
      )?.toString() ?? '';

    return (
      <LegendActionPopover
        label={label}
        onFilter={filterHandler}
        legendCellValueActions={legendCellValueActions}
        showDisabledFilterActions={!isFilterable}
        footerMessage={warningMessage}
      />
    );
  });
