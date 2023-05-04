/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
import { FormattedMessage } from '@kbn/i18n-react';

import { VisEditorOptionsProps } from '@kbn/visualizations-plugin/public';
import {
  ColorRanges,
  SetColorRangeValue,
  SwitchOption,
  SetColorSchemaOptionsValue,
  ColorSchemaOptions,
  RangeOption,
  PercentageModeOption,
} from '@kbn/vis-default-editor-plugin/public';
import { ColorMode, colorSchemas } from '@kbn/charts-plugin/public';
import { MetricVisParam, VisParams } from '../types';

const metricColorMode = [
  {
    id: ColorMode.None,
    label: i18n.translate('visTypeMetric.colorModes.noneOptionLabel', {
      defaultMessage: 'None',
    }),
  },
  {
    id: ColorMode.Labels,
    label: i18n.translate('visTypeMetric.colorModes.labelsOptionLabel', {
      defaultMessage: 'Labels',
    }),
  },
  {
    id: ColorMode.Background,
    label: i18n.translate('visTypeMetric.colorModes.backgroundOptionLabel', {
      defaultMessage: 'Background',
    }),
  },
];

function MetricVisOptions({
  stateParams,
  setValue,
  setValidity,
  setTouched,
  uiState,
}: VisEditorOptionsProps<VisParams>) {
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
    (id: string) => setMetricValue('metricColorMode', id as ColorMode),
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

        <PercentageModeOption
          data-test-subj="metricPercentageMode"
          percentageMode={stateParams.metric.percentageMode}
          formatPattern={stateParams.metric.percentageFormatPattern}
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
            options={metricColorMode}
            onChange={setColorMode}
          />
        </EuiFormRow>

        <ColorSchemaOptions
          colorSchema={stateParams.metric.colorSchema}
          colorSchemas={colorSchemas}
          disabled={
            stateParams.metric.colorsRange.length === 1 ||
            stateParams.metric.metricColorMode === ColorMode.None
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
