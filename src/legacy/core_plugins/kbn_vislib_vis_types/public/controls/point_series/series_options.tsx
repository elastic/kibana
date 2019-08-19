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

import React, { useState } from 'react';
import { get } from 'lodash';
import { EuiPanel, EuiTitle, EuiSpacer, EuiAccordion } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { AggConfig } from 'ui/vis';
import { VisOptionsProps } from 'ui/vis/editors/default';
import { BasicVislibParams, ValueAxis } from '../../types';
import { ChartOptions } from './chart_options';

interface SeriesOptionsProps extends VisOptionsProps<BasicVislibParams> {
  addValueAxis: () => ValueAxis;
}

function SeriesOptions(props: SeriesOptionsProps) {
  const { stateParams, setValue, aggs, addValueAxis } = props;

  const [lastCustomLabels, setLastCustomLabels] = useState({} as { [key: string]: string });
  // We track these so we can know when the agg is changed
  const [lastMatchingSeriesAggType, setLastMatchingSeriesAggType] = useState('');
  const [lastMatchingSeriesAggField, setLastMatchingSeriesAggField] = useState('');

  const updateAxisTitle = () => {
    stateParams.valueAxes.forEach((axis, axisNumber) => {
      let newCustomLabel = '';
      const isFirst = axisNumber === 0;
      const matchingSeries: AggConfig[] = [];

      stateParams.seriesParams.forEach((series, i) => {
        const isMatchingSeries = (isFirst && !series.valueAxis) || series.valueAxis === axis.id;
        if (isMatchingSeries) {
          let seriesNumber = 0;
          aggs.forEach((agg: AggConfig) => {
            if (agg.schema.name === 'metric') {
              if (seriesNumber === i) matchingSeries.push(agg);
              seriesNumber++;
            }
          });
        }
      });

      if (matchingSeries.length === 1) {
        newCustomLabel = matchingSeries[0].makeLabel();
      }

      const matchingSeriesAggType = get(matchingSeries, '[0]type.name', '');
      const matchingSeriesAggField = get(matchingSeries, '[0]params.field.name', '');

      if (lastCustomLabels[axis.id] !== newCustomLabel && newCustomLabel !== '') {
        const isFirstRender = Object.keys(lastCustomLabels).length === 0;
        const aggTypeIsChanged = lastMatchingSeriesAggType !== matchingSeriesAggType;
        const aggFieldIsChanged = lastMatchingSeriesAggField !== matchingSeriesAggField;
        const aggIsChanged = aggTypeIsChanged || aggFieldIsChanged;
        const axisTitleIsEmpty = axis.title.text === '';
        const lastCustomLabelMatchesAxisTitle = lastCustomLabels[axis.id] === axis.title.text;

        if (
          !isFirstRender &&
          (aggIsChanged || axisTitleIsEmpty || lastCustomLabelMatchesAxisTitle)
        ) {
          axis.title.text = newCustomLabel; // Override axis title with new custom label
        }

        setLastCustomLabels({ ...lastCustomLabels, [axis.id]: newCustomLabel });
      }

      setLastMatchingSeriesAggType(matchingSeriesAggType);
      setLastMatchingSeriesAggField(matchingSeriesAggField);
    });
  };

  const changeValueAxis = (index: number, selectedValueAxis: string) => {
    let newValueAxis = selectedValueAxis;
    if (selectedValueAxis === 'new') {
      const axis = addValueAxis();
      newValueAxis = axis.id;
    }
    // setChart
    const series = [...stateParams.seriesParams];
    series[index] = {
      ...series[index],
      valueAxis: newValueAxis,
    };
    setValue('seriesParams', series);

    updateAxisTitle();
  };

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
                {...props}
                changeValueAxis={changeValueAxis}
              />
            </>
          </EuiAccordion>
        ))}
      </EuiPanel>
    </>
  );
}

export { SeriesOptions };
