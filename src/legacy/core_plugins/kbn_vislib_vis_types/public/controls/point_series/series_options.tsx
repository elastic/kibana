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
import { EuiPanel, EuiTitle, EuiSpacer, EuiAccordion } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { VisOptionsProps } from 'ui/vis/editors/default';
import { BasicVislibParams, SeriesParam } from '../../types';
import { ChartTypes } from '../../utils/legend_positions';
import { SwitchOption } from '../switch';
import { SelectOption } from '../select';

function SeriesOptions(props: VisOptionsProps<BasicVislibParams>) {
  const { stateParams, setValue, vis } = props;

  const setChart = <T extends keyof BasicVislibParams['seriesParams']>(
    index: number,
    paramName: T,
    value: BasicVislibParams['seriesParams'][T]
  ) => {
    const series = [...stateParams.seriesParams];
    series[index] = {
      ...series[index],
      [paramName]: value,
    };
    setValue('seriesParams', series);
  };

  const changeValueAxis = () => {};

  const valueAxesOptions = useMemo(
    () => [
      ...stateParams.valueAxes,
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

              <SelectOption
                id={`seriesType${index}`}
                label={i18n.translate(
                  'kbnVislibVisTypes.controls.pointSeries.series.chartTypeLabel',
                  {
                    defaultMessage: 'Chart type',
                  }
                )}
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
                label={i18n.translate(
                  'kbnVislibVisTypes.controls.pointSeries.series.valueAxisLabel',
                  {
                    defaultMessage: 'Value axis',
                  }
                )}
                options={valueAxesOptions}
                paramName="valueAxis"
                value={chart.valueAxis}
                setValue={changeValueAxis}
              />

              {(chart.type === ChartTypes.LINE || chart.type === ChartTypes.AREA) && (
                <SelectOption
                  id={`lineMode${index}`}
                  label={i18n.translate(
                    'kbnVislibVisTypes.controls.pointSeries.series.lineModeLabel',
                    {
                      defaultMessage: 'Line mode',
                    }
                  )}
                  options={vis.type.editorConfig.collections.interpolationModes}
                  paramName="interpolate"
                  value={chart.interpolate}
                  setValue={(...params) => setChart(index, ...params)}
                />
              )}

              {chart.type === ChartTypes.LINE && (
                <SwitchOption
                  id={`drawLines${index}`}
                  label={i18n.translate(
                    'kbnVislibVisTypes.controls.pointSeries.series.showLineLabel',
                    {
                      defaultMessage: 'Show line',
                    }
                  )}
                  paramName="drawLinesBetweenPoints"
                  value={chart.drawLinesBetweenPoints}
                  setValue={(...params) => setChart(index, ...params)}
                />
              )}
            </>
          </EuiAccordion>
        ))}
      </EuiPanel>

      <EuiSpacer size="s" />
    </>
  );
}

export { SeriesOptions };
