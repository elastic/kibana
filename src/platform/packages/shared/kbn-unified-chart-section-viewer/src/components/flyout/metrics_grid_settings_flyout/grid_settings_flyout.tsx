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
  EuiSpacer,
  EuiFormRow,
  EuiSuperSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiAccordion,
  EuiIconTip,
  EuiButtonGroup,
  EuiTabs,
  EuiTab,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  HISTOGRAM_VISUALIZATION_CHART,
  type HistogramVisualization,
  type MetricsGridSettings,
} from '@kbn/discover-utils';
import { FEATURE_FLAG_DEFAULTS, FEATURE_FLAGS } from '../../../common/constants';
import { useTelemetry } from '../../../context/ebt_telemetry_context';
import { useFeatureFlag } from '../../../hooks/use_feature_flag';
import {
  COUNTER_OPTIONS,
  GAUGE_OPTIONS,
  HISTOGRAM_OPTIONS,
  HISTOGRAM_VISUALIZATION_OPTIONS,
} from './options';
import { getAggregationConfigChanges } from './get_aggregation_config_changes';
import { getChangedSettings } from './get_changed_settings';

/** Explains the percentile series when the selected visualization cannot use it directly. */
const getPercentileFallbackHint = (visualization: HistogramVisualization): string | undefined => {
  switch (visualization) {
    case 'percentile':
      return undefined;
    case 'distribution':
      return i18n.translate('metricsExperience.gridSettingsFlyout.percentileFallbackHelpText', {
        defaultMessage:
          'Used when dimensions are selected. Distribution cannot be split by them, so histograms show the selected percentile instead.',
      });
    default: {
      const unhandled: never = visualization;
      return unhandled;
    }
  }
};

const getPercentileFieldLabel = (visualization: HistogramVisualization): string => {
  switch (HISTOGRAM_VISUALIZATION_CHART[visualization]) {
    case 'series':
      return i18n.translate('metricsExperience.gridSettingsFlyout.percentileTypeLabel', {
        defaultMessage: 'Percentile type',
      });
    case 'heatmap':
      return i18n.translate('metricsExperience.gridSettingsFlyout.percentileFallbackLabel', {
        defaultMessage: 'Percentile fallback',
      });
    default: {
      const unhandled: never = HISTOGRAM_VISUALIZATION_CHART[visualization];
      return unhandled;
    }
  }
};

type SettingsTabId = 'metrics' | 'histograms';

interface GridSettingsFlyoutProps {
  gridSettings: MetricsGridSettings;
  onGridSettingsChange: (update: Partial<MetricsGridSettings>) => void;
  onClose: () => void;
}

export const GridSettingsFlyout = ({
  gridSettings,
  onGridSettingsChange,
  onClose,
}: GridSettingsFlyoutProps) => {
  const { trackAggregationConfigChanged } = useTelemetry();
  const titleId = useGeneratedHtmlId({ prefix: 'metricsGridSettingsFlyoutTitle' });
  const aggregationAccordionId = useGeneratedHtmlId({
    prefix: 'metricsGridSettingsAggregationAccordion',
  });

  const dataDisplayGroupDescription = i18n.translate(
    'metricsExperience.gridSettingsFlyout.dataDisplayGroupTooltip',
    {
      defaultMessage:
        'Set how data is displayed for each metric type. Changes apply to every metric of that type in this Discover tab.',
    }
  );

  const isHeatmapsEnabled = useFeatureFlag(
    FEATURE_FLAGS.IS_HEATMAPS_ENABLED,
    FEATURE_FLAG_DEFAULTS[FEATURE_FLAGS.IS_HEATMAPS_ENABLED]
  );
  const [draftSettings, setDraftSettings] = useState<MetricsGridSettings>(gridSettings);
  const [settingsTabId, setSettingsTabId] = useState<SettingsTabId>('metrics');
  const percentileFallbackHint = getPercentileFallbackHint(draftSettings.histogramVisualization);
  const histogramLabel = i18n.translate('metricsExperience.gridSettingsFlyout.histogramLabel', {
    defaultMessage: 'Histogram',
  });
  const histogramDisplayLabel = i18n.translate(
    'metricsExperience.gridSettingsFlyout.histogramDisplayLabel',
    {
      defaultMessage: 'Show as',
    }
  );
  const percentileFieldLabel = isHeatmapsEnabled
    ? getPercentileFieldLabel(draftSettings.histogramVisualization)
    : histogramLabel;

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

  const onHistogramDisplayChange = useCallback((id: string) => {
    const choice = HISTOGRAM_VISUALIZATION_OPTIONS.find((option) => option.id === id);
    if (!choice) {
      return;
    }
    setDraftSettings((current) => ({
      ...current,
      histogramVisualization: choice.id,
    }));
  }, []);

  const onApply = useCallback(() => {
    getAggregationConfigChanges(gridSettings, pendingUpdate).forEach((event) =>
      trackAggregationConfigChanged(event)
    );
    onGridSettingsChange(pendingUpdate);
    onClose();
  }, [gridSettings, onGridSettingsChange, onClose, pendingUpdate, trackAggregationConfigChanged]);

  return (
    <EuiFlyout
      onClose={onClose}
      size="s"
      type="push"
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
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h5>
                    {i18n.translate('metricsExperience.gridSettingsFlyout.dataDisplayGroupTitle', {
                      defaultMessage: 'Data display',
                    })}
                  </h5>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  type="info"
                  color="subdued"
                  aria-label={dataDisplayGroupDescription}
                  content={dataDisplayGroupDescription}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        >
          <EuiSpacer size="m" />
          {isHeatmapsEnabled ? (
            <>
              <EuiTabs size="s" data-test-subj="metricsExperienceGridSettingsTabs">
                <EuiTab
                  isSelected={settingsTabId === 'metrics'}
                  onClick={() => setSettingsTabId('metrics')}
                  data-test-subj="metricsExperienceGridSettingsMetricsTab"
                >
                  {i18n.translate('metricsExperience.gridSettingsFlyout.metricsTabLabel', {
                    defaultMessage: 'Counters and gauges',
                  })}
                </EuiTab>
                <EuiTab
                  isSelected={settingsTabId === 'histograms'}
                  onClick={() => setSettingsTabId('histograms')}
                  data-test-subj="metricsExperienceGridSettingsHistogramsTab"
                >
                  {i18n.translate('metricsExperience.gridSettingsFlyout.histogramsTabLabel', {
                    defaultMessage: 'Histograms',
                  })}
                </EuiTab>
              </EuiTabs>
              <EuiSpacer size="m" />
            </>
          ) : null}
          {settingsTabId === 'metrics' || !isHeatmapsEnabled ? (
            <>
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
            </>
          ) : null}
          {isHeatmapsEnabled && settingsTabId === 'histograms' ? (
            <>
              <EuiFormRow fullWidth label={histogramDisplayLabel}>
                <EuiButtonGroup
                  isFullWidth
                  buttonSize="s"
                  legend={histogramDisplayLabel}
                  data-test-subj="metricsExperienceGridSettingsHistogramDisplay"
                  variant="selection"
                  display="highlighted"
                  idSelected={draftSettings.histogramVisualization}
                  onChange={onHistogramDisplayChange}
                >
                  {HISTOGRAM_VISUALIZATION_OPTIONS.map((choice) => (
                    <EuiButton
                      key={choice.id}
                      id={choice.id}
                      iconType={choice.iconType}
                      data-test-subj={choice['data-test-subj']}
                    >
                      {choice.label}
                    </EuiButton>
                  ))}
                </EuiButtonGroup>
              </EuiFormRow>
              <EuiSpacer size="m" />
            </>
          ) : null}
          {settingsTabId === 'histograms' || !isHeatmapsEnabled ? (
            <EuiFormRow label={percentileFieldLabel} helpText={percentileFallbackHint}>
              <EuiSuperSelect
                data-test-subj="metricsExperienceGridSettingsHistogramSelect"
                options={HISTOGRAM_OPTIONS}
                valueOfSelected={draftSettings.histogramPercentile}
                onChange={(value) => onSettingChange('histogramPercentile', value)}
              />
            </EuiFormRow>
          ) : null}
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
