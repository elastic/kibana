/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useMemo, useCallback } from 'react';

import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { Vis } from '../../../../../../visualizations/public';
import { SelectOption } from '../../../../../../vis_default_editor/public';

import { SeriesParam, ValueAxis } from '../../../../types';
import { LineOptions } from './line_options';
import { SetParamByIndex, ChangeValueAxis } from '.';
import { ChartType } from '../../../../../common';

export type SetChart = <T extends keyof SeriesParam>(paramName: T, value: SeriesParam[T]) => void;

export interface ChartOptionsParams {
  chart: SeriesParam;
  index: number;
  changeValueAxis: ChangeValueAxis;
  setParamByIndex: SetParamByIndex;
  valueAxes: ValueAxis[];
  vis: Vis;
}

function ChartOptions({
  chart,
  index,
  valueAxes,
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
      ...valueAxes.map(({ id, name }: ValueAxis) => ({
        text: name,
        value: id,
      })),
      {
        text: i18n.translate('visTypeXy.controls.pointSeries.series.newAxisLabel', {
          defaultMessage: 'New axis…',
        }),
        value: 'new',
      },
    ],
    [valueAxes]
  );

  return (
    <>
      <SelectOption
        id={`seriesValueAxis${index}`}
        label={i18n.translate('visTypeXy.controls.pointSeries.series.valueAxisLabel', {
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
            label={i18n.translate('visTypeXy.controls.pointSeries.series.chartTypeLabel', {
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
            label={i18n.translate('visTypeXy.controls.pointSeries.series.modeLabel', {
              defaultMessage: 'Mode',
            })}
            options={vis.type.editorConfig.collections.chartModes}
            paramName="mode"
            value={chart.mode}
            setValue={setChart}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {chart.type === ChartType.Area && (
        <>
          <EuiSpacer size="m" />

          <SelectOption
            label={i18n.translate('visTypeXy.controls.pointSeries.series.lineModeLabel', {
              defaultMessage: 'Line mode',
            })}
            options={vis.type.editorConfig.collections.interpolationModes}
            paramName="interpolate"
            value={chart.interpolate}
            setValue={setChart}
          />
        </>
      )}

      {chart.type === ChartType.Line && <LineOptions chart={chart} vis={vis} setChart={setChart} />}
    </>
  );
}

export { ChartOptions };
