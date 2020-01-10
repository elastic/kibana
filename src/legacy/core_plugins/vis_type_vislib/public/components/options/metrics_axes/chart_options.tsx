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

import React, { useMemo, useCallback } from 'react';

import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { VisOptionsProps } from '../../../legacy_imports';
import { BasicVislibParams, SeriesParam, ValueAxis } from '../../../types';
import { ChartTypes } from '../../../utils/collections';
import { SelectOption } from '../../common';
import { LineOptions } from './line_options';
import { SetParamByIndex, ChangeValueAxis } from './';

export type SetChart = <T extends keyof SeriesParam>(paramName: T, value: SeriesParam[T]) => void;

export interface ChartOptionsParams extends VisOptionsProps<BasicVislibParams> {
  chart: SeriesParam;
  index: number;
  changeValueAxis: ChangeValueAxis;
  setParamByIndex: SetParamByIndex;
}

function ChartOptions({
  chart,
  index,
  stateParams,
  vis,
  changeValueAxis,
  setParamByIndex,
}: ChartOptionsParams) {
  const setChart: SetChart = useCallback(
    (paramName, value) => {
      setParamByIndex('seriesParams', index, paramName, value);
    },
    [setParamByIndex, index]
  );

  const setValueAxis = useCallback(
    (paramName, value) => {
      changeValueAxis(index, paramName, value);
    },
    [changeValueAxis, index]
  );

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
    [stateParams.valueAxes]
  );

  return (
    <>
      <SelectOption
        id={`seriesValueAxis${index}`}
        label={i18n.translate('kbnVislibVisTypes.controls.pointSeries.series.valueAxisLabel', {
          defaultMessage: 'Value axis',
        })}
        options={valueAxesOptions}
        paramName="valueAxis"
        value={chart.valueAxis}
        setValue={setValueAxis}
      />

      <EuiSpacer size="m" />

      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <SelectOption
            id={`seriesType${index}`}
            label={i18n.translate('kbnVislibVisTypes.controls.pointSeries.series.chartTypeLabel', {
              defaultMessage: 'Chart type',
            })}
            options={vis.type.editorConfig.collections.chartTypes}
            paramName="type"
            value={chart.type}
            setValue={setChart}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <SelectOption
            id={`seriesMode${index}`}
            label={i18n.translate('kbnVislibVisTypes.controls.pointSeries.series.modeLabel', {
              defaultMessage: 'Mode',
            })}
            options={vis.type.editorConfig.collections.chartModes}
            paramName="mode"
            value={chart.mode}
            setValue={setChart}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {chart.type === ChartTypes.AREA && (
        <>
          <EuiSpacer size="m" />

          <SelectOption
            label={i18n.translate('kbnVislibVisTypes.controls.pointSeries.series.lineModeLabel', {
              defaultMessage: 'Line mode',
            })}
            options={vis.type.editorConfig.collections.interpolationModes}
            paramName="interpolate"
            value={chart.interpolate}
            setValue={setChart}
          />
        </>
      )}

      {chart.type === ChartTypes.LINE && (
        <LineOptions chart={chart} vis={vis} setChart={setChart} />
      )}
    </>
  );
}

export { ChartOptions };
