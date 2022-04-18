/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import type {
  ExpressionFunctionDefinition,
  Datatable,
  Render,
} from '@kbn/expressions-plugin/common';
import { prepareLogTable, Dimension } from '@kbn/visualizations-plugin/public';
import type { ChartType } from '../../common';
import type { VisParams, XYVisConfig } from '../types';

export const visName = 'xy_vis';
export interface RenderValue {
  visData: Datatable;
  visType: ChartType;
  visConfig: VisParams;
  syncColors: boolean;
  syncTooltips: boolean;
}

export type VisTypeXyExpressionFunctionDefinition = ExpressionFunctionDefinition<
  typeof visName,
  Datatable,
  XYVisConfig,
  Render<RenderValue>
>;

export const visTypeXyVisFn = (): VisTypeXyExpressionFunctionDefinition => ({
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
      help: i18n.translate('visTypeXy.function.args.args.chartType.help', {
        defaultMessage: 'Type of a chart. Can be line, area or histogram',
      }),
    },
    addTimeMarker: {
      types: ['boolean'],
      help: i18n.translate('visTypeXy.function.args.addTimeMarker.help', {
        defaultMessage: 'Show time marker',
      }),
    },
    truncateLegend: {
      types: ['boolean'],
      help: i18n.translate('visTypeXy.function.args.truncateLegend.help', {
        defaultMessage: 'Defines if the legend will be truncated or not',
      }),
    },
    maxLegendLines: {
      types: ['number'],
      help: i18n.translate('visTypeXy.function.args.args.maxLegendLines.help', {
        defaultMessage: 'Defines the maximum lines per legend item',
      }),
    },
    legendSize: {
      types: ['number'],
      help: i18n.translate('visTypeXy.function.args.args.legendSize.help', {
        defaultMessage: 'Specifies the legend size in pixels.',
      }),
    },
    addLegend: {
      types: ['boolean'],
      help: i18n.translate('visTypeXy.function.args.addLegend.help', {
        defaultMessage: 'Show chart legend',
      }),
    },
    addTooltip: {
      types: ['boolean'],
      help: i18n.translate('visTypeXy.function.args.addTooltip.help', {
        defaultMessage: 'Show tooltip on hover',
      }),
    },
    legendPosition: {
      types: ['string'],
      help: i18n.translate('visTypeXy.function.args.legendPosition.help', {
        defaultMessage: 'Position the legend on top, bottom, left, right of the chart',
      }),
    },
    categoryAxes: {
      types: ['category_axis'],
      help: i18n.translate('visTypeXy.function.args.categoryAxes.help', {
        defaultMessage: 'Category axis config',
      }),
      multi: true,
    },
    thresholdLine: {
      types: ['threshold_line'],
      help: i18n.translate('visTypeXy.function.args.thresholdLine.help', {
        defaultMessage: 'Threshold line config',
      }),
    },
    labels: {
      types: ['label'],
      help: i18n.translate('visTypeXy.function.args.labels.help', {
        defaultMessage: 'Chart labels config',
      }),
    },
    orderBucketsBySum: {
      types: ['boolean'],
      help: i18n.translate('visTypeXy.function.args.orderBucketsBySum.help', {
        defaultMessage: 'Order buckets by sum',
      }),
    },
    seriesParams: {
      types: ['series_param'],
      help: i18n.translate('visTypeXy.function.args.seriesParams.help', {
        defaultMessage: 'Series param config',
      }),
      multi: true,
    },
    valueAxes: {
      types: ['value_axis'],
      help: i18n.translate('visTypeXy.function.args.valueAxes.help', {
        defaultMessage: 'Value axis config',
      }),
      multi: true,
    },
    radiusRatio: {
      types: ['number'],
      help: i18n.translate('visTypeXy.function.args.radiusRatio.help', {
        defaultMessage: 'Dot size ratio',
      }),
    },
    gridCategoryLines: {
      types: ['boolean'],
      help: i18n.translate('visTypeXy.function.args.gridCategoryLines.help', {
        defaultMessage: 'Show grid category lines in chart',
      }),
    },
    gridValueAxis: {
      types: ['string'],
      help: i18n.translate('visTypeXy.function.args.gridValueAxis.help', {
        defaultMessage: 'Name of value axis for which we show grid',
      }),
    },
    isVislibVis: {
      types: ['boolean'],
      help: i18n.translate('visTypeXy.function.args.isVislibVis.help', {
        defaultMessage:
          'Flag to indicate old vislib visualizations. Used for backwards compatibility including colors',
      }),
    },
    detailedTooltip: {
      types: ['boolean'],
      help: i18n.translate('visTypeXy.function.args.detailedTooltip.help', {
        defaultMessage: 'Show detailed tooltip',
      }),
    },
    fittingFunction: {
      types: ['string'],
      help: i18n.translate('visTypeXy.function.args.fittingFunction.help', {
        defaultMessage: 'Name of fitting function',
      }),
    },
    times: {
      types: ['time_marker'],
      help: i18n.translate('visTypeXy.function.args.times.help', {
        defaultMessage: 'Time marker config',
      }),
      multi: true,
    },
    palette: {
      types: ['string'],
      help: i18n.translate('visTypeXy.function.args.palette.help', {
        defaultMessage: 'Defines the chart palette name',
      }),
    },
    fillOpacity: {
      types: ['number'],
      help: i18n.translate('visTypeXy.function.args.fillOpacity.help', {
        defaultMessage: 'Defines the area chart fill opacity',
      }),
    },
    xDimension: {
      types: ['xy_dimension', 'null'],
      help: i18n.translate('visTypeXy.function.args.xDimension.help', {
        defaultMessage: 'X axis dimension config',
      }),
    },
    yDimension: {
      types: ['xy_dimension'],
      help: i18n.translate('visTypeXy.function.args.yDimension.help', {
        defaultMessage: 'Y axis dimension config',
      }),
      multi: true,
    },
    zDimension: {
      types: ['xy_dimension'],
      help: i18n.translate('visTypeXy.function.args.zDimension.help', {
        defaultMessage: 'Z axis dimension config',
      }),
      multi: true,
    },
    widthDimension: {
      types: ['xy_dimension'],
      help: i18n.translate('visTypeXy.function.args.widthDimension.help', {
        defaultMessage: 'Width dimension config',
      }),
      multi: true,
    },
    seriesDimension: {
      types: ['xy_dimension'],
      help: i18n.translate('visTypeXy.function.args.seriesDimension.help', {
        defaultMessage: 'Series dimension config',
      }),
      multi: true,
    },
    splitRowDimension: {
      types: ['xy_dimension'],
      help: i18n.translate('visTypeXy.function.args.splitRowDimension.help', {
        defaultMessage: 'Split by row dimension config',
      }),
      multi: true,
    },
    splitColumnDimension: {
      types: ['xy_dimension'],
      help: i18n.translate('visTypeXy.function.args.splitColumnDimension.help', {
        defaultMessage: 'Split by column dimension config',
      }),
      multi: true,
    },
    ariaLabel: {
      types: ['string'],
      help: i18n.translate('visTypeXy.function.args.ariaLabel.help', {
        defaultMessage: 'Specifies the aria label of the xy chart',
      }),
      required: false,
    },
  },
  fn(context, args, handlers) {
    const visType = args.chartType;
    const visConfig = {
      ariaLabel:
        args.ariaLabel ??
        (handlers.variables?.embeddableTitle as string) ??
        handlers.getExecutionContext?.()?.description,
      type: args.chartType,
      addLegend: args.addLegend,
      addTooltip: args.addTooltip,
      legendPosition: args.legendPosition,
      addTimeMarker: args.addTimeMarker,
      maxLegendLines: args.maxLegendLines,
      truncateLegend: args.truncateLegend,
      legendSize: args.legendSize,
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
      fillOpacity: args.fillOpacity,
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
      const argsTable: Dimension[] = [
        [
          args.yDimension,
          i18n.translate('visTypeXy.function.dimension.metric', {
            defaultMessage: 'Metric',
          }),
        ],
        [
          args.zDimension,
          i18n.translate('visTypeXy.function.adimension.dotSize', {
            defaultMessage: 'Dot size',
          }),
        ],
        [
          args.splitColumnDimension,
          i18n.translate('visTypeXy.function.dimension.splitcolumn', {
            defaultMessage: 'Column split',
          }),
        ],
        [
          args.splitRowDimension,
          i18n.translate('visTypeXy.function.dimension.splitrow', {
            defaultMessage: 'Row split',
          }),
        ],
      ];

      if (args.xDimension) {
        argsTable.push([
          [args.xDimension],
          i18n.translate('visTypeXy.function.adimension.bucket', {
            defaultMessage: 'Bucket',
          }),
        ]);
      }

      const logTable = prepareLogTable(context, argsTable);
      handlers.inspectorAdapters.tables.logDatatable('default', logTable);
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
        syncTooltips: handlers?.isSyncTooltipsEnabled?.() ?? false,
      },
    };
  },
});
