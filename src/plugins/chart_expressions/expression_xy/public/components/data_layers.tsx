/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import {
  AreaSeries,
  BarSeries,
  BarSeriesProps,
  CurveType,
  LabelOverflowConstraint,
  LineSeries,
} from '@elastic/charts';
import React, { FC } from 'react';
import { PaletteRegistry } from '@kbn/coloring';
import { FormatFactory } from '@kbn/field-formats-plugin/common';
import { getAccessorByDimension } from '@kbn/visualizations-plugin/common/utils';
import { PersistedState } from '@kbn/visualizations-plugin/public';
import {
  CommonXYDataLayerConfig,
  EndValue,
  FittingFunction,
  ValueLabelMode,
  XScaleType,
} from '../../common';
import { SeriesTypes, ValueLabelModes, AxisModes } from '../../common/constants';
import {
  getColorAssignments,
  getFitOptions,
  GroupsConfiguration,
  getSeriesProps,
  DatatablesWithFormatInfo,
  LayersAccessorsTitles,
  LayersFieldFormats,
  hasMultipleLayersWithSplits,
} from '../helpers';

interface Props {
  titles?: LayersAccessorsTitles;
  layers: CommonXYDataLayerConfig[];
  formatFactory: FormatFactory;
  chartHasMoreThanOneBarSeries?: boolean;
  yAxesConfiguration: GroupsConfiguration;
  xAxisConfiguration?: GroupsConfiguration[number];
  fittingFunction?: FittingFunction;
  endValue?: EndValue | undefined;
  paletteService: PaletteRegistry;
  formattedDatatables: DatatablesWithFormatInfo;
  syncColors?: boolean;
  timeZone?: string;
  emphasizeFitting?: boolean;
  fillOpacity?: number;
  minBarHeight: number;
  shouldShowValueLabels?: boolean;
  valueLabels: ValueLabelMode;
  defaultXScaleType: XScaleType;
  fieldFormats: LayersFieldFormats;
  uiState?: PersistedState;
  singleTable?: boolean;
  isDarkMode: boolean;
}

export const DataLayers: FC<Props> = ({
  titles = {},
  layers,
  endValue,
  timeZone,
  syncColors,
  valueLabels,
  fillOpacity,
  minBarHeight,
  formatFactory,
  paletteService,
  fittingFunction,
  emphasizeFitting,
  yAxesConfiguration,
  xAxisConfiguration,
  shouldShowValueLabels,
  formattedDatatables,
  chartHasMoreThanOneBarSeries,
  defaultXScaleType,
  fieldFormats,
  uiState,
  singleTable,
  isDarkMode,
}) => {
  // for singleTable mode we should use y accessors from all layers for creating correct series name and getting color
  const allYAccessors = layers.flatMap((layer) => layer.accessors);
  const allColumnsToLabel = layers.reduce((acc, layer) => {
    if (layer.columnToLabel) {
      return { ...acc, ...JSON.parse(layer.columnToLabel) };
    }

    return acc;
  }, {});
  const allYTitles = Object.keys(titles).reduce((acc, key) => {
    if (titles[key].yTitles) {
      return { ...acc, ...titles[key].yTitles };
    }
    return acc;
  }, {});
  const colorAssignments = singleTable
    ? getColorAssignments(
        [
          {
            ...layers[0],
            layerId: 'commonLayerId',
            accessors: allYAccessors,
            columnToLabel: JSON.stringify(allColumnsToLabel),
          },
        ],
        { commonLayerId: { ...titles, yTitles: allYTitles } },
        { commonLayerId: fieldFormats[layers[0].layerId] },
        { commonLayerId: formattedDatatables[layers[0].layerId] }
      )
    : getColorAssignments(layers, titles, fieldFormats, formattedDatatables);
  const multipleLayersWithSplits = hasMultipleLayersWithSplits(layers);
  return (
    <>
      {layers.flatMap((layer) => {
        const yPercentileAccessors: string[] = [];
        const yAccessors: string[] = [];
        layer.accessors.forEach((accessor) => {
          const columnId = getAccessorByDimension(accessor, layer.table.columns);
          if (columnId.includes('.')) {
            yPercentileAccessors.push(columnId);
          } else {
            yAccessors.push(columnId);
          }
        });
        return (
          yPercentileAccessors.length ? [...yAccessors, yPercentileAccessors] : [...yAccessors]
        ).map((accessor, accessorIndex) => {
          const { seriesType, columnToLabel, layerId } = layer;
          const yColumnId = Array.isArray(accessor) ? accessor[0] : accessor;
          const columnToLabelMap: Record<string, string> = columnToLabel
            ? JSON.parse(columnToLabel)
            : {};

          // what if row values are not primitive? That is the case of, for instance, Ranges
          // remaps them to their serialized version with the formatHint metadata
          // In order to do it we need to make a copy of the table as the raw one is required for more features (filters, etc...) later on
          const formattedDatatableInfo = formattedDatatables[layerId];

          const yAxis = yAxesConfiguration.find((axisConfiguration) =>
            axisConfiguration.series.find((currentSeries) => currentSeries.accessor === yColumnId)
          );

          const isPercentage = yAxis?.mode
            ? yAxis?.mode === AxisModes.PERCENTAGE
            : layer.isPercentage;

          const seriesProps = getSeriesProps({
            layer,
            titles: titles[layer.layerId],
            accessor,
            chartHasMoreThanOneBarSeries,
            colorAssignments,
            formatFactory,
            columnToLabelMap,
            paletteService,
            formattedDatatableInfo,
            syncColors,
            yAxis,
            xAxis: xAxisConfiguration,
            timeZone,
            emphasizeFitting,
            fillOpacity,
            defaultXScaleType,
            fieldFormats,
            uiState,
            allYAccessors,
            singleTable,
            multipleLayersWithSplits,
            isDarkMode,
          });

          const index = `${layer.layerId}-${accessorIndex}`;

          const curve = layer.curveType ? CurveType[layer.curveType] : undefined;

          switch (seriesType) {
            case SeriesTypes.LINE:
              return (
                <LineSeries
                  key={index}
                  {...seriesProps}
                  fit={getFitOptions(fittingFunction, endValue)}
                  curve={curve}
                />
              );
            case SeriesTypes.BAR:
              const valueLabelsSettings: Pick<BarSeriesProps, 'displayValueSettings'> = {
                displayValueSettings: {
                  // This format double fixes two issues in elastic-chart
                  // * when rotating the chart, the formatter is not correctly picked
                  // * in some scenarios value labels are not strings, and this breaks the elastic-chart lib
                  valueFormatter: (d: unknown) => yAxis?.formatter?.convert(d) || '',
                  showValueLabel: shouldShowValueLabels && valueLabels !== ValueLabelModes.HIDE,
                  isAlternatingValueLabel: false,
                  overflowConstraints: [
                    LabelOverflowConstraint.ChartEdges,
                    LabelOverflowConstraint.BarGeometry,
                  ],
                },
              };
              return (
                <BarSeries
                  key={index}
                  {...seriesProps}
                  {...valueLabelsSettings}
                  minBarHeight={minBarHeight}
                />
              );
            case SeriesTypes.AREA:
              return (
                <AreaSeries
                  key={index}
                  {...seriesProps}
                  fit={isPercentage ? 'zero' : getFitOptions(fittingFunction, endValue)}
                  curve={curve}
                />
              );
          }
        });
      })}
    </>
  );
};
