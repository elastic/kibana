/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useCallback } from 'react';

import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { Vis } from '../../../../../../visualizations/public';
import {
  NumberInputOption,
  SelectOption,
  SwitchOption,
} from '../../../../../../vis_default_editor/public';

import { SeriesParam } from '../../../../types';
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
            options={vis.type.editorConfig.collections.interpolationModes}
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

      <EuiSpacer size="m" />

      <SwitchOption
        label={i18n.translate('visTypeXy.controls.pointSeries.series.showDotsLabel', {
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
