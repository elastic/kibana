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

import { SwitchOption } from '@kbn/vis-default-editor-plugin/public';

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
        label={i18n.translate('visTypeXy.controls.pointSeries.series.circlesRadius', {
          defaultMessage: 'Dots size',
        })}
        fullWidth
        display="rowCompressed"
      >
        <EuiRange
          data-test-subj="circlesRadius"
          value={chart.circlesRadius}
          min={1}
          max={10}
          step={1}
          fullWidth
          disabled={!chart.showCircles}
          showInput
          compressed
          onChange={(e) => {
            setChart('circlesRadius', Number(e.currentTarget.value));
          }}
        />
      </EuiFormRow>
    </>
  );
}

export { PointOptions };
