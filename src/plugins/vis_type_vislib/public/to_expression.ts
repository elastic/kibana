/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import moment from 'moment';
import { get } from 'lodash';

import { SchemaConfig, ExpressionFn } from '../../visualizations/public';

export type XSchemaConfig = Omit<SchemaConfig, 'params'> & {
  params: {
    date?: boolean;
    interval?: number;
    format?: any;
    bounds?: any;
  };
};

export interface Dimensions {
  x: XSchemaConfig | null;
  y: SchemaConfig[];
  z?: SchemaConfig[];
  width?: SchemaConfig[];
  series?: SchemaConfig[];
  splitRow?: SchemaConfig[];
  splitColumn?: SchemaConfig[];
}

export const toExpression: ExpressionFn = async (vis, params, schemas): Promise<string> => {
  const dimensions: Dimensions = {
    x: schemas.segment ? schemas.segment[0] : null,
    y: schemas.metric,
    z: schemas.radius,
    width: schemas.width,
    series: schemas.group,
    splitRow: schemas.split_row,
    splitColumn: schemas.split_column,
  };

  const responseAggs = vis.data.aggs?.getResponseAggs().filter(({ enabled }) => enabled) ?? [];

  if (dimensions.x) {
    const xAgg = responseAggs[dimensions.x.accessor] as any;
    if (xAgg.type.name === 'date_histogram') {
      dimensions.x.params.date = true;
      const { esUnit, esValue } = xAgg.buckets.getInterval();
      dimensions.x.params.interval = moment.duration(esValue, esUnit).asMilliseconds();
      dimensions.x.params.format = xAgg.buckets.getScaledDateFormat();
      dimensions.x.params.bounds = xAgg.buckets.getBounds();
    } else if (xAgg.type.name === 'histogram') {
      const intervalParam = xAgg.type.paramByName('interval');
      const output = { params: {} as any };
      await intervalParam.modifyAggConfigOnSearchRequestStart(xAgg, vis.data.searchSource, {
        abortSignal: params.abortSignal,
      });
      intervalParam.write(xAgg, output);
      dimensions.x.params.interval = output.params.interval;
    }
  }

  const visConfig = vis.params;

  (dimensions.y || []).forEach((yDimension) => {
    const yAgg = responseAggs[yDimension.accessor];
    const seriesParam = (visConfig.seriesParams || []).find(
      (param: any) => param.data.id === yAgg.id
    );
    if (seriesParam) {
      const usedValueAxis = (visConfig.valueAxes || []).find(
        (valueAxis: any) => valueAxis.id === seriesParam.valueAxis
      );
      if (get(usedValueAxis, 'scale.mode') === 'percentage') {
        yDimension.format = { id: 'percent' };
      }
    }
    if (get(visConfig, 'gauge.percentageMode') === true) {
      yDimension.format = { id: 'percent' };
    }
  });

  visConfig.dimensions = dimensions;

  const configStr = `visConfig='${JSON.stringify(visConfig)
    .replace(/\\/g, `\\\\`)
    .replace(/'/g, `\\'`)}' `;
  return `vislib type='${vis.type.name}' ${configStr}`;
};
