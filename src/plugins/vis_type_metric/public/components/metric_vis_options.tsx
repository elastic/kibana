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
import {
  EuiButtonGroup,
  EuiButtonGroupProps,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { VisOptionsProps } from 'src/plugins/vis_default_editor/public';
import {
  ColorModes,
  ColorRanges,
  ColorSchemaOptions,
  SwitchOption,
  RangeOption,
  SetColorSchemaOptionsValue,
  SetColorRangeValue,
} from '../../../charts/public';
import { MetricVisParam, VisParams } from '../types';

function MetricVisOptions({
  stateParams,
  setValue,
  setValidity,
  setTouched,
  vis,
  uiState,
}: VisOptionsProps<VisParams>) {
  const setMetricValue: <T extends keyof MetricVisParam>(
    paramName: T,
    value: MetricVisParam[T]
  ) => void = useCallback(
    (paramName, value) =>
      setValue('metric', {
        ...stateParams.metric,
        [paramName]: value,
      }),
    [setValue, stateParams.metric]
  );

  const setMetricLabels: <T extends keyof MetricVisParam['labels']>(
    paramName: T,
    value: MetricVisParam['labels'][T]
  ) => void = useCallback(
    (paramName, value) =>
      setMetricValue('labels', {
        ...stateParams.metric.labels,
        [paramName]: value,
      }),
    [setMetricValue, stateParams.metric.labels]
  );

  const setMetricStyle: <T extends keyof MetricVisParam['style']>(
    paramName: T,
    value: MetricVisParam['style'][T]
  ) => void = useCallback(
    (paramName, value) =>
      setMetricValue('style', {
        ...stateParams.metric.style,
        [paramName]: value,
      }),
    [setMetricValue, stateParams.metric.style]
  );

  const setColorMode: EuiButtonGroupProps['onChange'] = useCallback(
    (id) => setMetricValue('metricColorMode', id as ColorModes),
    [setMetricValue]
  );

  const metricColorModeLabel = i18n.translate('visTypeMetric.params.color.useForLabel', {
    defaultMessage: 'Use color for',
  });

  return (
    <>
      <EuiPanel paddingSize="s">
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage id="visTypeMetric.params.settingsTitle" defaultMessage="Settings" />
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />

        <SwitchOption
          label={i18n.translate('visTypeMetric.params.percentageModeLabel', {
            defaultMessage: 'Percentage mode',
          })}
          paramName="percentageMode"
          value={stateParams.metric.percentageMode}
          setValue={setMetricValue}
        />

        <SwitchOption
          label={i18n.translate('visTypeMetric.params.showTitleLabel', {
            defaultMessage: 'Show title',
          })}
          paramName="show"
          value={stateParams.metric.labels.show}
          setValue={setMetricLabels}
        />
      </EuiPanel>

      <EuiSpacer size="s" />

      <EuiPanel paddingSize="s">
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage id="visTypeMetric.params.rangesTitle" defaultMessage="Ranges" />
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />

        <ColorRanges
          data-test-subj="metricColorRange"
          colorsRange={stateParams.metric.colorsRange}
          setValue={setMetricValue as SetColorRangeValue}
          setTouched={setTouched}
          setValidity={setValidity}
        />

        <EuiFormRow fullWidth display="rowCompressed" label={metricColorModeLabel}>
          <EuiButtonGroup
            buttonSize="compressed"
            idSelected={stateParams.metric.metricColorMode}
            isDisabled={stateParams.metric.colorsRange.length === 1}
            isFullWidth={true}
            legend={metricColorModeLabel}
            options={vis.type.editorConfig.collections.metricColorMode}
            onChange={setColorMode}
          />
        </EuiFormRow>

        <ColorSchemaOptions
          colorSchema={stateParams.metric.colorSchema}
          colorSchemas={vis.type.editorConfig.collections.colorSchemas}
          disabled={
            stateParams.metric.colorsRange.length === 1 ||
            stateParams.metric.metricColorMode === ColorModes.NONE
          }
          invertColors={stateParams.metric.invertColors}
          setValue={setMetricValue as SetColorSchemaOptionsValue}
          showHelpText={false}
          uiState={uiState}
        />
      </EuiPanel>

      <EuiSpacer size="s" />

      <EuiPanel paddingSize="s">
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage id="visTypeMetric.params.style.styleTitle" defaultMessage="Style" />
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />

        <RangeOption
          label={i18n.translate('visTypeMetric.params.style.fontSizeLabel', {
            defaultMessage: 'Metric font size in points',
          })}
          min={12}
          max={120}
          paramName="fontSize"
          value={stateParams.metric.style.fontSize}
          setValue={setMetricStyle}
          showInput={true}
          showLabels={true}
          showValue={false}
        />
      </EuiPanel>
    </>
  );
}

export { MetricVisOptions };
