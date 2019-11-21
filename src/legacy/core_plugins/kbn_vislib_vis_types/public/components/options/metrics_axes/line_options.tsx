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

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { Vis } from 'ui/vis';
import { SeriesParam } from '../../../types';
import { NumberInputOption, SelectOption, SwitchOption } from '../../common';
import { SetChart } from './chart_options';

export interface LineOptionsParams {
  chart: SeriesParam;
  vis: Vis;
  setChart: SetChart;
}

function LineOptions({ chart, vis, setChart }: LineOptionsParams) {
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
        label={i18n.translate('kbnVislibVisTypes.controls.pointSeries.series.showLineLabel', {
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
            label={i18n.translate('kbnVislibVisTypes.controls.pointSeries.series.lineModeLabel', {
              defaultMessage: 'Line mode',
            })}
            options={vis.type.editorConfig.collections.interpolationModes}
            paramName="interpolate"
            value={chart.interpolate}
            setValue={setChart}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <NumberInputOption
            disabled={!chart.drawLinesBetweenPoints}
            label={i18n.translate('kbnVislibVisTypes.controls.pointSeries.series.lineWidthLabel', {
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

      <EuiSpacer size="m" />

      <SwitchOption
        label={i18n.translate('kbnVislibVisTypes.controls.pointSeries.series.showDotsLabel', {
          defaultMessage: 'Show dots',
        })}
        paramName="showCircles"
        value={chart.showCircles}
        setValue={setChart}
      />
    </>
  );
}

export { LineOptions };
