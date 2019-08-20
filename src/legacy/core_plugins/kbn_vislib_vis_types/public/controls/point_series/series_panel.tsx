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
import { EuiPanel, EuiTitle, EuiSpacer, EuiAccordion } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { VisOptionsProps } from 'ui/vis/editors/default';
import { BasicVislibParams, ValueAxis } from '../../types';
import { ChartOptions, SetChartValueByIndex } from './components/chart_options';

interface SeriesPanelProps extends VisOptionsProps<BasicVislibParams> {
  addValueAxis: () => ValueAxis;
  updateAxisTitle: () => void;
}

function SeriesPanel(props: SeriesPanelProps) {
  const { stateParams, setValue, addValueAxis, updateAxisTitle } = props;

  const setChartValueByIndex: SetChartValueByIndex = useCallback(
    (index, paramName, value) => {
      const series = [...stateParams.seriesParams];
      series[index] = {
        ...series[index],
        [paramName]: value,
      };
      setValue('seriesParams', series);
    },
    [setValue, stateParams.seriesParams]
  );

  const changeValueAxis = (index: number, paramName: 'valueAxis', selectedValueAxis: string) => {
    let newValueAxis = selectedValueAxis;
    if (selectedValueAxis === 'new') {
      const axis = addValueAxis();
      newValueAxis = axis.id;
    }
    // setChart
    setChartValueByIndex(index, paramName, newValueAxis);

    updateAxisTitle();
  };

  return (
    <EuiPanel paddingSize="s">
      <EuiTitle size="xs">
        <h2>
          <FormattedMessage
            id="kbnVislibVisTypes.controls.pointSeries.series.metricsTitle"
            defaultMessage="Metrics"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="s" />

      {stateParams.seriesParams.map((chart, index) => (
        <EuiAccordion
          id={`visEditorSeriesAccordion${chart.data.id}`}
          key={index}
          className="visEditorSidebar__section visEditorSidebar__collapsible"
          initialIsOpen={index === 0}
          buttonContent={chart.data.label}
          aria-label={i18n.translate(
            'kbnVislibVisTypes.controls.pointSeries.seriesAccordionAriaLabel',
            {
              defaultMessage: 'Toggle {agg} options',
              values: { agg: chart.data.label },
            }
          )}
        >
          <>
            <EuiSpacer size="m" />

            <ChartOptions
              index={index}
              chart={chart}
              changeValueAxis={changeValueAxis}
              setChartValueByIndex={setChartValueByIndex}
              {...props}
            />
          </>
        </EuiAccordion>
      ))}
    </EuiPanel>
  );
}

export { SeriesPanel };
