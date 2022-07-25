/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';

import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import {
  NumberInputOption,
  SelectOption,
  SwitchOption,
} from '@kbn/vis-default-editor-plugin/public';

import { SeriesParam } from '../../../../types';
import { SetChart } from './chart_options';
import { getInterpolationModes } from '../../../collections';

const interpolationModes = getInterpolationModes();

export interface LineOptionsParams {
  chart: SeriesParam;
  setChart: SetChart;
}

function LineOptions({ chart, setChart }: LineOptionsParams) {
  const setLineWidth = useCallback(
    (paramName: 'lineWidth', value: number | '') => {
      setChart(paramName, value === '' ? undefined : value);
    },
    [setChart]
  );

  return (
    <>
      <EuiSpacer size="m" />

      <SwitchOption
        label={i18n.translate('visTypeXy.controls.pointSeries.series.showLineLabel', {
          defaultMessage: 'Show line',
        })}
        paramName="drawLinesBetweenPoints"
        value={chart.drawLinesBetweenPoints}
        setValue={setChart}
      />

      <EuiSpacer size="m" />

      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <SelectOption
            disabled={!chart.drawLinesBetweenPoints}
            label={i18n.translate('visTypeXy.controls.pointSeries.series.lineModeLabel', {
              defaultMessage: 'Line mode',
            })}
            options={interpolationModes}
            paramName="interpolate"
            value={chart.interpolate}
            setValue={setChart}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <NumberInputOption
            disabled={!chart.drawLinesBetweenPoints}
            label={i18n.translate('visTypeXy.controls.pointSeries.series.lineWidthLabel', {
              defaultMessage: 'Line width',
            })}
            paramName="lineWidth"
            step={0.5}
            min={0}
            value={chart.lineWidth}
            setValue={setLineWidth}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}

export { LineOptions };
