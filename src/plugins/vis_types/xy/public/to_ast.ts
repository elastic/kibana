/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';

import {
  VisToExpressionAst,
  getVisSchemas,
  DateHistogramParams,
  ExpressionValueVisDimension,
  SchemaConfig,
} from '../../../visualizations/public';
import { buildExpression, buildExpressionFunction } from '../../../expressions/public';
import { BUCKET_TYPES } from '../../../data/public';
import { Labels } from '../../../charts/public';

import {
  Dimensions,
  VisTypeXyConfig,
  CategoryAxis,
  SeriesParam,
  ThresholdLine,
  ValueAxis,
  Scale,
  TimeMarker,
  AxisMode,
  XDomainArguments,
  Dimension,
  VisTypeXy,
  ChartType,
  XyVisType,
} from '../../../chart_expressions/expression_xy/common';
import {
  EXPRESSION_NAME,
  getColumnByAccessor,
} from '../../../chart_expressions/expression_xy/common';
import { getTimeZone } from '../../../chart_expressions/expression_xy/public';
import { getEsaggsFn } from './to_ast_esaggs';
import { TimeRangeBounds } from '../../../data/common';

type XDomainPreArgs = Omit<XDomainArguments, 'column'> & {
  column?: Omit<ExpressionValueVisDimension, 'type'>;
};

const prepareLabel = (data: Labels) => {
  const label = buildExpressionFunction('label', {
    ...data,
  });

  return buildExpression([label]);
};

const prepareScale = (data: Scale) => {
  const scale = buildExpressionFunction('visscale', {
    ...data,
  });

  return buildExpression([scale]);
};

const prepareThresholdLine = (data: ThresholdLine) => {
  const thresholdLine = buildExpressionFunction('thresholdline', {
    ...data,
  });

  return buildExpression([thresholdLine]);
};

const prepareTimeMarker = (data: TimeMarker) => {
  const timeMarker = buildExpressionFunction('timemarker', {
    ...data,
  });

  return buildExpression([timeMarker]);
};

const prepareCategoryAxis = (data: CategoryAxis) => {
  const categoryAxis = buildExpressionFunction('categoryaxis', {
    id: data.id,
    show: data.show,
    position: data.position,
    type: data.type,
    title: data.title.text,
    scale: prepareScale(data.scale),
    labels: prepareLabel(data.labels),
  });

  return buildExpression([categoryAxis]);
};

const prepareValueAxis = (data: ValueAxis) => {
  const categoryAxis = buildExpressionFunction('valueaxis', {
    name: data.name,
    axisParams: prepareCategoryAxis({
      ...data,
    }),
  });

  return buildExpression([categoryAxis]);
};

const prepareSeriesParam = (data: SeriesParam) => {
  const seriesParam = buildExpressionFunction('seriesparam', {
    label: data.data.label,
    id: data.data.id,
    drawLinesBetweenPoints: data.drawLinesBetweenPoints,
    interpolate: data.interpolate,
    lineWidth: data.lineWidth,
    mode: data.mode,
    show: data.show,
    showCircles: data.showCircles,
    circlesRadius: data.circlesRadius,
    type: data.type,
    valueAxis: data.valueAxis,
  });

  return buildExpression([seriesParam]);
};

const prepareVisDimension = <T extends Omit<ExpressionValueVisDimension, 'type'>>(data: T) => {
  const visDimension = buildExpressionFunction('visdimension', { accessor: data.accessor });

  if (data.format) {
    visDimension.addArgument('format', data.format.id);
    visDimension.addArgument('formatParams', JSON.stringify(data.format.params));
  }

  return buildExpression([visDimension]);
};

const prepareXYDimension = <T extends Dimension>(data: T) => {
  const xyDimension = buildExpressionFunction('xydimension', {
    params: JSON.stringify(data.params),
    label: data.label,
    visDimension: prepareVisDimension({
      ...data,
      format: {
        ...data.format,
        params: data.format.params ?? {},
      },
    }),
    id: data.id,
  });

  return buildExpression([xyDimension]);
};

const prepareXDomain = (data: XDomainPreArgs) => {
  const column = data.column ? prepareVisDimension(data.column) : undefined;
  const xDomain = buildExpressionFunction('x_domain', {
    ...data,
    column,
  });

  return buildExpression([xDomain]);
};

const getDimensionFromSchemaConfig = (schemaConfig: SchemaConfig): Dimension => ({
  ...schemaConfig,
  params: {},
});

export const toExpressionAst: VisToExpressionAst<VisTypeXyConfig> = async (vis, params) => {
  const schemas = getVisSchemas(vis, params);
  const dimensions: Dimensions = {
    x: schemas.segment ? getDimensionFromSchemaConfig(schemas.segment[0]) : null,
    y: schemas.metric.map(getDimensionFromSchemaConfig),
    z: schemas.radius?.map(getDimensionFromSchemaConfig),
    width: schemas.width?.map(getDimensionFromSchemaConfig),
    series: schemas.group?.map(getDimensionFromSchemaConfig),
    splitRow: schemas.split_row?.map(getDimensionFromSchemaConfig),
    splitColumn: schemas.split_column?.map(getDimensionFromSchemaConfig),
  };

  const responseAggs = vis.data.aggs?.getResponseAggs().filter(({ enabled }) => enabled) ?? [];

  const xAgg = dimensions.x ? getColumnByAccessor(responseAggs, dimensions.x?.accessor) : null;

  const enableHistogramMode = ([
    BUCKET_TYPES.HISTOGRAM,
    BUCKET_TYPES.DATE_HISTOGRAM,
  ] as string[]).includes(xAgg?.type?.name ?? '');

  const xDomain: XDomainPreArgs = {};
  if (dimensions.x && !dimensions.x.params) {
    dimensions.x.params = {};
  }

  if (dimensions.x && xAgg) {
    if (xAgg.type.name === BUCKET_TYPES.DATE_HISTOGRAM) {
      const timeZone = getTimeZone();

      (dimensions.x.params as DateHistogramParams).date = true;
      (dimensions.x.params as DateHistogramParams).format =
        xAgg.buckets?.getScaledDateFormat() ?? '';

      const { esUnit, esValue } = xAgg.buckets?.getInterval() ?? {};

      xDomain.timezone = timeZone;
      xDomain.intervalValue = esValue;
      xDomain.intervalUnit = esUnit;
      xDomain.minInterval = moment.duration(esValue, esUnit).asMilliseconds();

      const bounds = xAgg.buckets?.getBounds() as TimeRangeBounds | undefined;

      if (bounds && bounds?.min && bounds?.max) {
        xDomain.min = bounds.min.valueOf();
        xDomain.max = bounds.max.valueOf();
      }
    } else if (xAgg.type.name === BUCKET_TYPES.HISTOGRAM) {
      const intervalParam = xAgg.type.paramByName('interval');
      const output = { params: {} as any };
      await intervalParam?.modifyAggConfigOnSearchRequestStart(xAgg, vis.data.searchSource, {
        abortSignal: params.abortSignal,
      });
      intervalParam?.write(xAgg, output);

      xDomain.minInterval = output.params.interval;
    }
  }

  (dimensions.y || []).forEach((yDimension) => {
    const yAgg = getColumnByAccessor(responseAggs, yDimension.accessor);
    const seriesParam = (vis.params.seriesParams || []).find(
      (param: any) => param.data.id === yAgg.id
    );
    if (seriesParam) {
      const usedValueAxis = (vis.params.valueAxes || []).find(
        (valueAxis: any) => valueAxis.id === seriesParam.valueAxis
      );
      if (usedValueAxis?.scale.mode === AxisMode.Percentage) {
        yDimension.format = { id: 'percent' };
      }
    }
    // if aggType is 'Count', need to display only integers at y-axis
    // prevent from displaying floats on small charts with small step
    if (yDimension.aggType === 'count') {
      if (!yDimension.params) {
        yDimension.params = {};
      }

      yDimension.params.integersOnly = true;
    }
  });

  const considerInterval = !vis.params.seriesParams.filter((sp) => sp.type === ChartType.Histogram)
    .length;

  xDomain.considerInterval = considerInterval;
  xDomain.column =
    dimensions.x?.accessor !== undefined && dimensions.x?.accessor !== null
      ? {
          accessor: dimensions.x?.accessor,
          format: {
            ...(dimensions.x?.format ?? {}),
            params: dimensions.x?.format?.params ?? {},
          },
        }
      : undefined;

  const visTypeXy = buildExpressionFunction<VisTypeXy>(EXPRESSION_NAME, {
    type: vis.type.name as XyVisType,
    chartType: vis.params.type,
    addTimeMarker: vis.params.addTimeMarker,
    truncateLegend: vis.params.truncateLegend,
    maxLegendLines: vis.params.maxLegendLines,
    addLegend: vis.params.addLegend,
    addTooltip: vis.params.addTooltip,
    legendPosition: vis.params.legendPosition,
    orderBucketsBySum: vis.params.orderBucketsBySum,
    categoryAxes: vis.params.categoryAxes.map(prepareCategoryAxis),
    valueAxes: vis.params.valueAxes.map(prepareValueAxis),
    seriesParams: vis.params.seriesParams.map(prepareSeriesParam),
    labels: prepareLabel(vis.params.labels),
    thresholdLine: prepareThresholdLine(vis.params.thresholdLine),
    gridCategoryLines: vis.params.grid.categoryLines,
    gridValueAxis: vis.params.grid.valueAxis,
    radiusRatio: vis.params.radiusRatio,
    isVislibVis: vis.params.isVislibVis,
    detailedTooltip: vis.params.detailedTooltip,
    fittingFunction: vis.params.fittingFunction,
    times: vis.params.times.map(prepareTimeMarker),
    palette: vis.params.palette.name,
    fillOpacity: vis.params.fillOpacity,
    xDimension: dimensions.x ? prepareXYDimension(dimensions.x) : null,
    yDimension: dimensions.y.map(prepareXYDimension),
    zDimension: dimensions.z?.map(prepareXYDimension),
    widthDimension: dimensions.width?.map(prepareXYDimension),
    seriesDimension: dimensions.series?.map(prepareXYDimension),
    splitRowDimension: dimensions.splitRow?.map(prepareXYDimension),
    splitColumnDimension: dimensions.splitColumn?.map(prepareXYDimension),
    enableHistogramMode,
    xDomain: prepareXDomain(xDomain),
  });

  const ast = buildExpression([getEsaggsFn(vis), visTypeXy]);

  return ast.toAst();
};
