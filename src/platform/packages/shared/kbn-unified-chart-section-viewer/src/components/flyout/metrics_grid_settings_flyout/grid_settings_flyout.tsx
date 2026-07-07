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
  EuiAccordion,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { MetricsGridSettings } from '../../../types';
import { COUNTER_OPTIONS, GAUGE_OPTIONS, HISTOGRAM_OPTIONS } from './options';

interface GridSettingsFlyoutProps {
  gridSettings: MetricsGridSettings;
  onGridSettingsChange: (update: Partial<MetricsGridSettings>) => void;
  onClose: () => void;
}

const getChangedSettings = (
  draft: MetricsGridSettings,
  applied: MetricsGridSettings
): Partial<MetricsGridSettings> =>
  Object.fromEntries(
    Object.keys(draft)
      .filter((key) => draft[key] !== applied[key])
      .map((key) => [key, draft[key]])
  );

export const GridSettingsFlyout = ({
  gridSettings,
  onGridSettingsChange,
  onClose,
}: GridSettingsFlyoutProps) => {
  const titleId = useGeneratedHtmlId({ prefix: 'metricsGridSettingsFlyoutTitle' });
  const aggregationAccordionId = useGeneratedHtmlId({
    prefix: 'metricsGridSettingsAggregationAccordion',
  });

  const [draftSettings, setDraftSettings] = useState<MetricsGridSettings>(gridSettings);

  const pendingUpdate = useMemo(
    () => getChangedSettings(draftSettings, gridSettings),
    [draftSettings, gridSettings]
  );
  const hasChanges = Object.keys(pendingUpdate).length > 0;

  const onSettingChange = useCallback(
    <K extends keyof MetricsGridSettings>(key: K, value: MetricsGridSettings[K]) => {
      setDraftSettings((current) => ({ ...current, [key]: value }));
    },
    []
  );

  const onApply = useCallback(() => {
    onGridSettingsChange(pendingUpdate);
    onClose();
  }, [onGridSettingsChange, onClose, pendingUpdate]);

  return (
    <EuiFlyout
      onClose={onClose}
      size="s"
      ownFocus
      data-test-subj="metricsExperienceGridSettingsFlyout"
      aria-labelledby={titleId}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="xs">
          <h2 id={titleId}>
            {i18n.translate('metricsExperience.gridSettingsFlyout.title', {
              defaultMessage: 'Configuration',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiAccordion
          id={aggregationAccordionId}
          initialIsOpen
          data-test-subj="metricsExperienceGridSettingsAggregationAccordion"
          buttonContent={
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('metricsExperience.gridSettingsFlyout.aggregationGroupLabel', {
                  defaultMessage: 'Aggregation',
                })}
              </h3>
            </EuiTitle>
          }
        >
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('metricsExperience.gridSettingsFlyout.subtitle', {
                defaultMessage: 'These aggregation settings apply to all metrics in this view.',
              })}
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiFormRow
            label={i18n.translate('metricsExperience.gridSettingsFlyout.counterLabel', {
              defaultMessage: 'Counter',
            })}
          >
            <EuiSuperSelect
              data-test-subj="metricsExperienceGridSettingsCounterSelect"
              options={COUNTER_OPTIONS}
              valueOfSelected={draftSettings.counterAggregation}
              onChange={(value) => onSettingChange('counterAggregation', value)}
            />
          </EuiFormRow>
          <EuiSpacer size="m" />
          <EuiFormRow
            label={i18n.translate('metricsExperience.gridSettingsFlyout.gaugeLabel', {
              defaultMessage: 'Gauge',
            })}
          >
            <EuiSuperSelect
              data-test-subj="metricsExperienceGridSettingsGaugeSelect"
              options={GAUGE_OPTIONS}
              valueOfSelected={draftSettings.gaugeAggregation}
              onChange={(value) => onSettingChange('gaugeAggregation', value)}
            />
          </EuiFormRow>
          <EuiSpacer size="m" />
          <EuiFormRow
            label={i18n.translate('metricsExperience.gridSettingsFlyout.histogramLabel', {
              defaultMessage: 'Histogram',
            })}
          >
            <EuiSuperSelect
              data-test-subj="metricsExperienceGridSettingsHistogramSelect"
              options={HISTOGRAM_OPTIONS}
              valueOfSelected={draftSettings.histogramPercentile}
              onChange={(value) => onSettingChange('histogramPercentile', value)}
            />
          </EuiFormRow>
        </EuiAccordion>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={onClose}
              data-test-subj="metricsExperienceGridSettingsCancelButton"
            >
              {i18n.translate('metricsExperience.gridSettingsFlyout.cancelButtonLabel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={onApply}
              fill
              disabled={!hasChanges}
              data-test-subj="metricsExperienceGridSettingsApplyButton"
            >
              {i18n.translate('metricsExperience.gridSettingsFlyout.applyButtonLabel', {
                defaultMessage: 'Apply and close',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
