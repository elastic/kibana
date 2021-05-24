/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { EuiRange, EuiFormRow, EuiSpacer } from '@elastic/eui';

import { SwitchOption } from '../../../../../../vis_default_editor/public';

import { SeriesParam } from '../../../../types';
import { SetChart } from './chart_options';

export interface PointOptionsParams {
  chart: SeriesParam;
  setChart: SetChart;
}

function PointOptions({ chart, setChart }: PointOptionsParams) {
  return (
    <>
      <EuiSpacer size="m" />
      <SwitchOption
        label={i18n.translate('visTypeXy.controls.pointSeries.series.showDotsLabel', {
          defaultMessage: 'Show dots',
        })}
        paramName="showCircles"
        value={chart.showCircles}
        setValue={setChart}
      />
      <EuiSpacer size="m" />
      <EuiFormRow
        label={i18n.translate('isTypeXy.controls.pointSeries.series.dotsRadius', {
          defaultMessage: 'Dots size',
        })}
        fullWidth
        display="rowCompressed"
      >
        <EuiRange
          data-test-subj="dotsRadius"
          value={chart.dotsRadius}
          min={1}
          max={10}
          step={1}
          disabled={!chart.showCircles}
          showInput
          compressed
          onChange={(e) => {
            setChart('dotsRadius', Number(e.currentTarget.value));
          }}
        />
      </EuiFormRow>
    </>
  );
}

export { PointOptions };
