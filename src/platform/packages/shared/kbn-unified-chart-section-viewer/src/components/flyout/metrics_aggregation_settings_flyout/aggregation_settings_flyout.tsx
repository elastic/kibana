/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiFormRow,
  EuiSuperSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { MetricsAggregationSettings } from '../../../types';
import { COUNTER_OPTIONS, GAUGE_OPTIONS, HISTOGRAM_OPTIONS } from './options';

interface AggregationSettingsFlyoutProps {
  aggregationSettings: MetricsAggregationSettings;
  onAggregationSettingsChange: (update: Partial<MetricsAggregationSettings>) => void;
  onClose: () => void;
}

const getChangedSettings = (
  draft: MetricsAggregationSettings,
  applied: MetricsAggregationSettings
): Partial<MetricsAggregationSettings> =>
  Object.fromEntries(
    Object.keys(draft)
      .filter((key) => draft[key] !== applied[key])
      .map((key) => [key, draft[key]])
  );

export const AggregationSettingsFlyout = ({
  aggregationSettings,
  onAggregationSettingsChange,
  onClose,
}: AggregationSettingsFlyoutProps) => {
  const titleId = useGeneratedHtmlId({ prefix: 'metricsAggregationSettingsFlyoutTitle' });

  const [draftSettings, setDraftSettings] =
    useState<MetricsAggregationSettings>(aggregationSettings);

  const pendingUpdate = useMemo(
    () => getChangedSettings(draftSettings, aggregationSettings),
    [draftSettings, aggregationSettings]
  );
  const hasChanges = Object.keys(pendingUpdate).length > 0;

  const onSettingChange = useCallback(
    <K extends keyof MetricsAggregationSettings>(key: K, value: MetricsAggregationSettings[K]) => {
      setDraftSettings((current) => ({ ...current, [key]: value }));
    },
    []
  );

  const onApply = useCallback(() => {
    onAggregationSettingsChange(pendingUpdate);
    onClose();
  }, [onAggregationSettingsChange, onClose, pendingUpdate]);

  return (
    <EuiFlyout
      onClose={onClose}
      size="s"
      ownFocus
      data-test-subj="metricsExperienceAggregationSettingsFlyout"
      aria-labelledby={titleId}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="xs">
          <h2 id={titleId}>
            {i18n.translate('metricsExperience.aggregationSettingsFlyout.title', {
              defaultMessage: 'Configuration',
            })}
          </h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('metricsExperience.aggregationSettingsFlyout.subtitle', {
              defaultMessage: 'These aggregation settings apply to all metrics in this view.',
            })}
          </p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFormRow
          label={i18n.translate('metricsExperience.aggregationSettingsFlyout.counterLabel', {
            defaultMessage: 'Counter',
          })}
          labelAppend={
            <EuiText size="xs" color="subdued">
              {i18n.translate('metricsExperience.aggregationSettingsFlyout.optionalText', {
                defaultMessage: 'Optional',
              })}
            </EuiText>
          }
        >
          <EuiSuperSelect
            data-test-subj="metricsExperienceAggregationSettingsCounterSelect"
            options={COUNTER_OPTIONS}
            valueOfSelected={draftSettings.counterAggregation}
            onChange={(value) => onSettingChange('counterAggregation', value)}
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiFormRow
          label={i18n.translate('metricsExperience.aggregationSettingsFlyout.gaugeLabel', {
            defaultMessage: 'Gauge',
          })}
          labelAppend={
            <EuiText size="xs" color="subdued">
              {i18n.translate('metricsExperience.aggregationSettingsFlyout.optionalText', {
                defaultMessage: 'Optional',
              })}
            </EuiText>
          }
        >
          <EuiSuperSelect
            data-test-subj="metricsExperienceAggregationSettingsGaugeSelect"
            options={GAUGE_OPTIONS}
            valueOfSelected={draftSettings.gaugeAggregation}
            onChange={(value) => onSettingChange('gaugeAggregation', value)}
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiFormRow
          label={i18n.translate('metricsExperience.aggregationSettingsFlyout.histogramLabel', {
            defaultMessage: 'Histogram percentile',
          })}
          labelAppend={
            <EuiText size="xs" color="subdued">
              {i18n.translate('metricsExperience.aggregationSettingsFlyout.optionalText', {
                defaultMessage: 'Optional',
              })}
            </EuiText>
          }
        >
          <EuiSuperSelect
            data-test-subj="metricsExperienceAggregationSettingsHistogramSelect"
            options={HISTOGRAM_OPTIONS}
            valueOfSelected={draftSettings.histogramPercentile}
            onChange={(value) => onSettingChange('histogramPercentile', value)}
          />
        </EuiFormRow>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={onClose}
              data-test-subj="metricsExperienceAggregationSettingsCancelButton"
            >
              {i18n.translate('metricsExperience.aggregationSettingsFlyout.cancelButtonLabel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={onApply}
              fill
              disabled={!hasChanges}
              data-test-subj="metricsExperienceAggregationSettingsApplyButton"
            >
              {i18n.translate('metricsExperience.aggregationSettingsFlyout.applyButtonLabel', {
                defaultMessage: 'Apply and close',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
