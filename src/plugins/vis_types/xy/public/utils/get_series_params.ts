/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { AggConfigs } from '@kbn/data-plugin/public';
import { ValueAxis, SeriesParam, ChartMode, InterpolationMode } from '../types';
import { ChartType } from '../../common';

const makeSerie = (
  id: string,
  label: string,
  defaultValueAxis: ValueAxis['id'],
  lastSerie?: SeriesParam
): SeriesParam => {
  const data = { id, label };
  const defaultSerie = {
    show: true,
    mode: ChartMode.Normal,
    type: ChartType.Line,
    drawLinesBetweenPoints: true,
    showCircles: true,
    circlesRadius: 1,
    interpolate: InterpolationMode.Linear,
    lineWidth: 2,
    valueAxis: defaultValueAxis,
  };
  return { ...defaultSerie, ...lastSerie, data };
};
export const getSeriesParams = (
  aggs: AggConfigs | undefined,
  seriesParams: SeriesParam[],
  schemaName: string,
  firstValueAxesId: string
) => {
  const metrics = aggs?.bySchemaName(schemaName);

  return metrics?.map((agg) => {
    const params = seriesParams.find((param) => param.data.id === agg.id);
    const label = agg.makeLabel();

    // update labels for existing params or create new one
    if (params) {
      return {
        ...params,
        data: {
          ...params.data,
          label,
        },
      };
    } else {
      const series = makeSerie(
        agg.id,
        label,
        firstValueAxesId,
        seriesParams[seriesParams.length - 1]
      );
      return series;
    }
  });
};
