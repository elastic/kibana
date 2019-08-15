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

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';

import { VisOptionsProps } from 'ui/vis/editors/default';
import { BasicVislibParams, SeriesParam, ValueAxis } from '../../types';
import { ChartTypes } from '../../utils/collections';
import { SelectOption } from '../select';
import { LineOptions } from './line_options';

interface ChartOptionsParams extends VisOptionsProps<BasicVislibParams> {
  index: number;
  chart: SeriesParam;
  changeValueAxis: (index: number) => void;
}

function ChartOptions({
  stateParams,
  setValue,
  vis,
  chart,
  index,
  changeValueAxis,
}: ChartOptionsParams) {
  const setChart = <T extends keyof SeriesParam>(
    indx: number,
    paramName: T,
    value: SeriesParam[T]
  ) => {
    const series = [...stateParams.seriesParams];
    series[indx] = {
      ...series[indx],
      [paramName]: value,
    };
    setValue('seriesParams', series);
  };

  const valueAxesOptions = useMemo(
    () => [
      ...stateParams.valueAxes.map(({ id, name }: ValueAxis) => ({
        text: name,
        value: id,
      })),
      {
        text: i18n.translate('kbnVislibVisTypes.controls.pointSeries.series.newAxisLabel', {
          defaultMessage: 'New axis…',
        }),
        value: 'new',
      },
    ],
    [stateParams.valueAxes.map(({ id }: ValueAxis) => id)]
  );

  return (
    <>
      <SelectOption
        id={`seriesType${index}`}
        label={i18n.translate('kbnVislibVisTypes.controls.pointSeries.series.chartTypeLabel', {
          defaultMessage: 'Chart type',
        })}
        options={vis.type.editorConfig.collections.chartTypes}
        paramName="type"
        value={chart.type}
        setValue={(...params) => setChart(index, ...params)}
      />

      <SelectOption
        id={`seriesMode${index}`}
        label={i18n.translate('kbnVislibVisTypes.controls.pointSeries.series.modeLabel', {
          defaultMessage: 'Mode',
        })}
        options={vis.type.editorConfig.collections.chartModes}
        paramName="mode"
        value={chart.mode}
        setValue={(...params) => setChart(index, ...params)}
      />

      <SelectOption
        id={`seriesValueAxis${index}`}
        label={i18n.translate('kbnVislibVisTypes.controls.pointSeries.series.valueAxisLabel', {
          defaultMessage: 'Value axis',
        })}
        options={valueAxesOptions}
        paramName="valueAxis"
        value={chart.valueAxis}
        setValue={(...params) => {
          setChart(index, ...params);
          changeValueAxis(index);
        }}
      />

      {(chart.type === ChartTypes.LINE || chart.type === ChartTypes.AREA) && (
        <SelectOption
          id={`lineMode${index}`}
          label={i18n.translate('kbnVislibVisTypes.controls.pointSeries.series.lineModeLabel', {
            defaultMessage: 'Line mode',
          })}
          options={vis.type.editorConfig.collections.interpolationModes}
          paramName="interpolate"
          value={chart.interpolate}
          setValue={(...params) => setChart(index, ...params)}
        />
      )}

      {chart.type === ChartTypes.LINE && (
        <LineOptions chart={chart} setChart={(...params) => setChart(index, ...params)} />
      )}
    </>
  );
}

export { ChartOptions };
