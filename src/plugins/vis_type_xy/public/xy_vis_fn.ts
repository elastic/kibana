/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import { ExpressionFunctionDefinition, Datatable, Render } from '../../expressions/public';

import { ChartType } from '../common';
import { VisParams, XYVisConfig } from './types';

export const visName = 'xy_vis';
export interface RenderValue {
  visData: Datatable;
  visType: ChartType;
  visConfig: VisParams;
  syncColors: boolean;
}

export type VisTypeXyExpressionFunctionDefinition = ExpressionFunctionDefinition<
  typeof visName,
  Datatable,
  XYVisConfig,
  Render<RenderValue>
>;

export const createVisTypeXyVisFn = (): VisTypeXyExpressionFunctionDefinition => ({
  name: visName,
  type: 'render',
  context: {
    types: ['datatable'],
  },
  help: i18n.translate('visTypeXy.functions.help', {
    defaultMessage: 'XY visualization',
  }),
  args: {
    type: {
      types: ['string'],
      default: '""',
      help: 'xy vis type',
    },
    chartType: {
      types: ['string'],
      help: i18n.translate('visTypeXy.function.chartType.help', {
        defaultMessage: 'Type of a chart',
      }),
    },
    addTimeMarker: {
      types: ['boolean'],
      help: i18n.translate('visTypeXy.function.addTimeMarker.help', {
        defaultMessage: 'Show time marker',
      }),
    },
    addLegend: {
      types: ['boolean'],
      help: i18n.translate('visTypeXy.function.addLegend.help', {
        defaultMessage: 'Show legend chart legend',
      }),
    },
    addTooltip: {
      types: ['boolean'],
      help: i18n.translate('visTypeXy.function.addTooltip.help', {
        defaultMessage: 'Show tooltip on hover',
      }),
    },
    legendPosition: {
      types: ['string'],
      help: i18n.translate('visTypeXy.function.legendPosition.help', {
        defaultMessage: 'Position the legend on top, bottom, left, right of the chart',
      }),
    },
    categoryAxes: {
      types: ['category_axis'],
      help: i18n.translate('visTypeXy.function.categoryAxes.help', {
        defaultMessage: 'Category axis config',
      }),
      multi: true,
    },
    thresholdLine: {
      types: ['threshold_line'],
      help: i18n.translate('visTypeXy.function.thresholdLine.help', {
        defaultMessage: 'Threshold line config',
      }),
    },
    labels: {
      types: ['label'],
      help: i18n.translate('visTypeXy.function.labels.help', {
        defaultMessage: 'Chart labels config',
      }),
    },
    orderBucketsBySum: {
      types: ['boolean'],
      help: i18n.translate('visTypeXy.function.orderBucketsBySum.help', {
        defaultMessage: 'Order buckets by sum',
      }),
    },
    seriesParams: {
      types: ['series_param'],
      help: i18n.translate('visTypeXy.function.seriesParams.help', {
        defaultMessage: 'Series param config',
      }),
      multi: true,
    },
    valueAxes: {
      types: ['value_axis'],
      help: i18n.translate('visTypeXy.function.valueAxes.help', {
        defaultMessage: 'Value axis config',
      }),
      multi: true,
    },
    radiusRatio: {
      types: ['number'],
      help: i18n.translate('visTypeXy.function.radiusRatio.help', {
        defaultMessage: 'Dot size ratio',
      }),
    },
    gridCategoryLines: {
      types: ['boolean'],
      help: i18n.translate('visTypeXy.function.gridCategoryLines.help', {
        defaultMessage: 'Show grid category lines in chart',
      }),
    },
    gridValueAxis: {
      types: ['string'],
      help: i18n.translate('visTypeXy.function.gridCategoryLines.help', {
        defaultMessage: 'Name of value axis for which we show grid',
      }),
    },
    isVislibVis: {
      types: ['boolean'],
      help: i18n.translate('visTypeXy.function.isVislibVis.help', {
        defaultMessage:
          'Flag to indicate old vislib visualizations. Used for backwards compatibility including colors',
      }),
    },
    detailedTooltip: {
      types: ['boolean'],
      help: i18n.translate('visTypeXy.function.detailedTooltip.help', {
        defaultMessage: 'Show detailed tooltip',
      }),
    },
    fittingFunction: {
      types: ['string'],
      help: i18n.translate('visTypeXy.function.fittingFunction.help', {
        defaultMessage: 'Name of fitting function',
      }),
    },
    times: {
      types: ['time_marker'],
      help: i18n.translate('visTypeXy.function.times.help', {
        defaultMessage: 'times',
      }),
      multi: true,
    },
    palette: {
      types: ['string'],
      help: i18n.translate('visTypeXy.function.palette.help', {
        defaultMessage: 'Defines the chart palette name',
      }),
    },
    xDimension: {
      types: ['xy_dimension', 'null'],
      help: i18n.translate('visTypeXy.function.xDimension.help', {
        defaultMessage: 'X axis dimension config',
      }),
    },
    yDimension: {
      types: ['xy_dimension'],
      help: i18n.translate('visTypeXy.function.yDimension.help', {
        defaultMessage: 'Y axis dimension config',
      }),
      multi: true,
    },
    zDimension: {
      types: ['xy_dimension'],
      help: i18n.translate('visTypeXy.function.zDimension.help', {
        defaultMessage: 'Z axis dimension config',
      }),
      multi: true,
    },
    widthDimension: {
      types: ['xy_dimension'],
      help: i18n.translate('visTypeXy.function.width.help', {
        defaultMessage: 'Width dimension config',
      }),
      multi: true,
    },
    seriesDimension: {
      types: ['xy_dimension'],
      help: i18n.translate('visTypeXy.function.series.help', {
        defaultMessage: 'Series dimension config',
      }),
      multi: true,
    },
    splitRowDimension: {
      types: ['xy_dimension'],
      help: i18n.translate('visTypeXy.function.splitRow.help', {
        defaultMessage: 'Split by row dimension config',
      }),
      multi: true,
    },
    splitColumnDimension: {
      types: ['xy_dimension'],
      help: i18n.translate('visTypeXy.function.splitRow.help', {
        defaultMessage: 'Split by column dimension config',
      }),
      multi: true,
    },
  },
  fn(context, args, handlers) {
    const visType = args.chartType;
    const visConfig = {
      type: args.chartType,
      addLegend: args.addLegend,
      addTooltip: args.addTooltip,
      legendPosition: args.legendPosition,
      addTimeMarker: args.addTimeMarker,
      categoryAxes: args.categoryAxes.map((categoryAxis) => ({
        ...categoryAxis,
        type: categoryAxis.axisType,
      })),
      orderBucketsBySum: args.orderBucketsBySum,
      labels: args.labels,
      thresholdLine: args.thresholdLine,
      valueAxes: args.valueAxes.map((valueAxis) => ({ ...valueAxis, type: valueAxis.axisType })),
      grid: {
        categoryLines: args.gridCategoryLines,
        valueAxis: args.gridValueAxis,
      },
      seriesParams: args.seriesParams.map((seriesParam) => ({
        ...seriesParam,
        type: seriesParam.seriesParamType,
      })),
      radiusRatio: args.radiusRatio,
      times: args.times,
      isVislibVis: args.isVislibVis,
      detailedTooltip: args.detailedTooltip,
      palette: {
        type: 'palette',
        name: args.palette,
      },
      fittingFunction: args.fittingFunction,
      dimensions: {
        x: args.xDimension,
        y: args.yDimension,
        z: args.zDimension,
        width: args.widthDimension,
        series: args.seriesDimension,
        splitRow: args.splitRowDimension,
        splitColumn: args.splitColumnDimension,
      },
    } as VisParams;

    if (handlers?.inspectorAdapters?.tables) {
      handlers.inspectorAdapters.tables.logDatatable('default', context);
    }

    return {
      type: 'render',
      as: visName,
      value: {
        context,
        visType,
        visConfig,
        visData: context,
        syncColors: handlers?.isSyncColorsEnabled?.() ?? false,
      },
    };
  },
});
