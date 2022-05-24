/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EsaggsExpressionFunctionDefinition,
  IndexPatternLoadExpressionFunctionDefinition,
} from '@kbn/data-plugin/public';
import { buildExpression, buildExpressionFunction } from '@kbn/expressions-plugin/public';
import { getVisSchemas, SchemaConfig, VisToExpressionAst } from '@kbn/visualizations-plugin/public';
import { TableVisParams } from '../common';
import { TableExpressionFunctionDefinition } from './table_vis_fn';

const prepareDimension = (params: SchemaConfig) => {
  const visdimension = buildExpressionFunction('visdimension', { accessor: params.accessor });

  if (params.format) {
    visdimension.addArgument('format', params.format.id);
    visdimension.addArgument('formatParams', JSON.stringify(params.format.params));
  }

  return buildExpression([visdimension]);
};

const getMetrics = (schemas: ReturnType<typeof getVisSchemas>, visParams: TableVisParams) => {
  const metrics = [...schemas.metric];

  if (schemas.bucket && visParams.showPartialRows && !visParams.showMetricsAtAllLevels) {
    // Handle case where user wants to see partial rows but not metrics at all levels.
    // This requires calculating how many metrics will come back in the tabified response,
    // and removing all metrics from the dimensions except the last set.
    const metricsPerBucket = metrics.length / schemas.bucket.length;
    metrics.splice(0, metricsPerBucket * schemas.bucket.length - metricsPerBucket);
  }

  return metrics;
};

export const toExpressionAst: VisToExpressionAst<TableVisParams> = (vis, params) => {
  const esaggs = buildExpressionFunction<EsaggsExpressionFunctionDefinition>('esaggs', {
    index: buildExpression([
      buildExpressionFunction<IndexPatternLoadExpressionFunctionDefinition>('indexPatternLoad', {
        id: vis.data.indexPattern!.id!,
      }),
    ]),
    metricsAtAllLevels: vis.isHierarchical(),
    partialRows: vis.params.showPartialRows,
    aggs: vis.data.aggs!.aggs.map((agg) => buildExpression(agg.toExpressionAst())),
  });

  const schemas = getVisSchemas(vis, params);
  const metrics = getMetrics(schemas, vis.params);

  const args = {
    // explicitly pass each param to prevent extra values trapping
    perPage: vis.params.perPage,
    percentageCol: vis.params.percentageCol,
    row: vis.params.row,
    showPartialRows: vis.params.showPartialRows,
    showMetricsAtAllLevels: vis.params.showMetricsAtAllLevels,
    showToolbar: vis.params.showToolbar,
    showTotal: vis.params.showTotal,
    autoFitRowToContent: vis.params.autoFitRowToContent,
    totalFunc: vis.params.totalFunc,
    title: vis.title,
    metrics: metrics.map(prepareDimension),
    buckets: schemas.bucket?.map(prepareDimension),
  };

  const table = buildExpressionFunction<TableExpressionFunctionDefinition>('kibana_table', args);

  if (schemas.split_column) {
    table.addArgument('splitColumn', prepareDimension(schemas.split_column[0]));
  }

  if (schemas.split_row) {
    table.addArgument('splitRow', prepareDimension(schemas.split_row[0]));
  }

  const ast = buildExpression([esaggs, table]);

  return ast.toAst();
};
