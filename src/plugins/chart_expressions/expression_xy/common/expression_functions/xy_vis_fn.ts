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
  ExpressionValueRender,
} from '../../../../expressions/common';
import { prepareLogTable, Dimension } from '../../../../visualizations/public';
import { isValidSeriesForDimension } from '../utils/accessors';
import { EXPRESSION_NAME } from '..';
import { VisTypeXyArguments, VisTypeXyConfig, VisTypeXyRenderConfig } from '../types';

export type VisTypeXyExpressionFunctionDefinition = ExpressionFunctionDefinition<
  typeof EXPRESSION_NAME,
  Datatable,
  VisTypeXyArguments,
  ExpressionValueRender<VisTypeXyRenderConfig>
>;

export const visTypeXyVisFn = (): VisTypeXyExpressionFunctionDefinition => ({
  name: EXPRESSION_NAME,
  type: 'render',
  context: {
    types: ['datatable'],
  },
  help: i18n.translate('expressionXy.functions.help', {
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
      help: i18n.translate('expressionXy.function.args.args.chartType.help', {
        defaultMessage: 'Type of a chart. Can be line, area or histogram',
      }),
    },
    addTimeMarker: {
      types: ['boolean'],
      help: i18n.translate('expressionXy.function.args.addTimeMarker.help', {
        defaultMessage: 'Show time marker',
      }),
    },
    truncateLegend: {
      types: ['boolean'],
      help: i18n.translate('expressionXy.function.args.truncateLegend.help', {
        defaultMessage: 'Defines if the legend will be truncated or not',
      }),
    },
    maxLegendLines: {
      types: ['number'],
      help: i18n.translate('expressionXy.function.args.args.maxLegendLines.help', {
        defaultMessage: 'Defines the maximum lines per legend item',
      }),
    },
    addLegend: {
      types: ['boolean'],
      help: i18n.translate('expressionXy.function.args.addLegend.help', {
        defaultMessage: 'Show chart legend',
      }),
    },
    addTooltip: {
      types: ['boolean'],
      help: i18n.translate('expressionXy.function.args.addTooltip.help', {
        defaultMessage: 'Show tooltip on hover',
      }),
    },
    legendPosition: {
      types: ['string'],
      help: i18n.translate('expressionXy.function.args.legendPosition.help', {
        defaultMessage: 'Position the legend on top, bottom, left, right of the chart',
      }),
    },
    categoryAxes: {
      types: ['category_axis'],
      help: i18n.translate('expressionXy.function.args.categoryAxes.help', {
        defaultMessage: 'Category axis config',
      }),
      multi: true,
    },
    thresholdLine: {
      types: ['threshold_line'],
      help: i18n.translate('expressionXy.function.args.thresholdLine.help', {
        defaultMessage: 'Threshold line config',
      }),
    },
    labels: {
      types: ['label'],
      help: i18n.translate('expressionXy.function.args.labels.help', {
        defaultMessage: 'Chart labels config',
      }),
    },
    orderBucketsBySum: {
      types: ['boolean'],
      help: i18n.translate('expressionXy.function.args.orderBucketsBySum.help', {
        defaultMessage: 'Order buckets by sum',
      }),
    },
    seriesParams: {
      types: ['series_param'],
      help: i18n.translate('expressionXy.function.args.seriesParams.help', {
        defaultMessage: 'Series param config',
      }),
      multi: true,
    },
    valueAxes: {
      types: ['value_axis'],
      help: i18n.translate('expressionXy.function.args.valueAxes.help', {
        defaultMessage: 'Value axis config',
      }),
      multi: true,
    },
    radiusRatio: {
      types: ['number'],
      help: i18n.translate('expressionXy.function.args.radiusRatio.help', {
        defaultMessage: 'Dot size ratio',
      }),
    },
    gridCategoryLines: {
      types: ['boolean'],
      help: i18n.translate('expressionXy.function.args.gridCategoryLines.help', {
        defaultMessage: 'Show grid category lines in chart',
      }),
    },
    gridValueAxis: {
      types: ['string'],
      help: i18n.translate('expressionXy.function.args.gridValueAxis.help', {
        defaultMessage: 'Name of value axis for which we show grid',
      }),
    },
    isVislibVis: {
      types: ['boolean'],
      help: i18n.translate('expressionXy.function.args.isVislibVis.help', {
        defaultMessage:
          'Flag to indicate old vislib visualizations. Used for backwards compatibility including colors',
      }),
    },
    enableHistogramMode: {
      types: ['boolean'],
      help: i18n.translate('expressionXy.function.args.enableHistogramMode.help', {
        defaultMessage: 'Flag to enable histogram mode',
      }),
    },
    detailedTooltip: {
      types: ['boolean'],
      help: i18n.translate('expressionXy.function.args.detailedTooltip.help', {
        defaultMessage: 'Show detailed tooltip',
      }),
    },
    fittingFunction: {
      types: ['string'],
      help: i18n.translate('expressionXy.function.args.fittingFunction.help', {
        defaultMessage: 'Name of fitting function',
      }),
    },
    times: {
      types: ['time_marker'],
      help: i18n.translate('expressionXy.function.args.times.help', {
        defaultMessage: 'Time marker config',
      }),
      multi: true,
    },
    palette: {
      types: ['string'],
      help: i18n.translate('expressionXy.function.args.palette.help', {
        defaultMessage: 'Defines the chart palette name',
      }),
    },
    fillOpacity: {
      types: ['number'],
      help: i18n.translate('expressionXy.function.args.fillOpacity.help', {
        defaultMessage: 'Defines the area chart fill opacity',
      }),
    },
    xDimension: {
      types: ['xy_dimension', 'null'],
      help: i18n.translate('expressionXy.function.args.xDimension.help', {
        defaultMessage: 'X axis dimension config',
      }),
    },
    yDimension: {
      types: ['xy_dimension'],
      help: i18n.translate('expressionXy.function.args.yDimension.help', {
        defaultMessage: 'Y axis dimension config',
      }),
      multi: true,
    },
    zDimension: {
      types: ['xy_dimension'],
      help: i18n.translate('expressionXy.function.args.zDimension.help', {
        defaultMessage: 'Z axis dimension config',
      }),
      multi: true,
    },
    widthDimension: {
      types: ['xy_dimension'],
      help: i18n.translate('expressionXy.function.args.widthDimension.help', {
        defaultMessage: 'Width dimension config',
      }),
      multi: true,
    },
    seriesDimension: {
      types: ['xy_dimension'],
      help: i18n.translate('expressionXy.function.args.seriesDimension.help', {
        defaultMessage: 'Series dimension config',
      }),
      multi: true,
    },
    splitRowDimension: {
      types: ['xy_dimension'],
      help: i18n.translate('expressionXy.function.args.splitRowDimension.help', {
        defaultMessage: 'Split by row dimension config',
      }),
      multi: true,
    },
    splitColumnDimension: {
      types: ['xy_dimension'],
      help: i18n.translate('expressionXy.function.args.splitColumnDimension.help', {
        defaultMessage: 'Split by column dimension config',
      }),
      multi: true,
    },
    xDomain: {
      types: ['x_domain'],
      help: i18n.translate('expressionXy.function.args.xDomain.help', {
        defaultMessage: 'x_domains',
      }),
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
      maxLegendLines: args.maxLegendLines,
      truncateLegend: args.truncateLegend,
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
      seriesParams: args.seriesParams.map((seriesParam) => {
        const matchedSeries = args.yDimension.filter(({ id, accessor }) =>
          isValidSeriesForDimension(seriesParam.data.id)({ id, accessor })
        );
        return {
          ...seriesParam,
          show: matchedSeries.length > 0,
          type: seriesParam.seriesParamType,
        };
      }),
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
      enableHistogramMode: args.enableHistogramMode,
      // @TODO: This part of `VisParams` has special details of esaggs query, but it seems to me,
      // as a chart, it should know nothing from such information in the purpose of the reusability
      // with other functions.
      // For example, if we would like to use `essql`, `esdocs`, or even `demodata` functions,
      // this chart vis would not fully support rendering of that data with flexibility.
      dimensions: {
        x: args.xDimension,
        y: args.yDimension,
        z: args.zDimension,
        width: args.widthDimension,
        series: args.seriesDimension,
        splitRow: args.splitRowDimension,
        splitColumn: args.splitColumnDimension,
      },
      xDomain: args.xDomain,
      // ------------------------------------------------------------------------------------------------------------------
    } as VisTypeXyConfig; /* @TODO: rewrite this `as VisParams` to real `VisParams` via changing accessor 
                      to vis_dimension accessor (accepting string, not only number) */

    if (handlers?.inspectorAdapters?.tables) {
      const argsTable: Dimension[] = [
        [
          args.yDimension,
          i18n.translate('expressionXy.function.dimension.metric', {
            defaultMessage: 'Metric',
          }),
        ],
        [
          args.zDimension,
          i18n.translate('expressionXy.function.adimension.dotSize', {
            defaultMessage: 'Dot size',
          }),
        ],
        [
          args.splitColumnDimension,
          i18n.translate('expressionXy.function.dimension.splitcolumn', {
            defaultMessage: 'Column split',
          }),
        ],
        [
          args.splitRowDimension,
          i18n.translate('expressionXy.function.dimension.splitrow', {
            defaultMessage: 'Row split',
          }),
        ],
      ];

      if (args.xDimension) {
        argsTable.push([
          [args.xDimension],
          i18n.translate('expressionXy.function.adimension.bucket', {
            defaultMessage: 'Bucket',
          }),
        ]);
      }

      const logTable = prepareLogTable(context, argsTable);
      handlers.inspectorAdapters.tables.logDatatable('default', logTable);
    }

    return {
      type: 'render',
      as: EXPRESSION_NAME,
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
