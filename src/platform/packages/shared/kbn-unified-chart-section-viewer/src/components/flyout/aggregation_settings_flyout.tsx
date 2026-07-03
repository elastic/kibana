/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiListGroup,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiListGroupItemProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  HistogramPercentile,
  MetricsAggregationSettings,
  SimpleAggregation,
} from '../../types';
import {
  HISTOGRAM_PERCENTILE_OPTIONS,
  SIMPLE_AGGREGATION_OPTIONS,
} from '../../common/utils/aggregation_settings';

interface AggregationSettingsFlyoutProps {
  aggregationSettings: MetricsAggregationSettings;
  onAggregationSettingsChange: (update: Partial<MetricsAggregationSettings>) => void;
  onClose: () => void;
}

const flyoutTitle = i18n.translate('metricsExperience.aggregationSettingsFlyout.title', {
  defaultMessage: 'Edit metric aggregations',
});

const counterLabel = i18n.translate('metricsExperience.aggregationSettingsFlyout.counterLabel', {
  defaultMessage: 'Counter',
});

const gaugeLabel = i18n.translate('metricsExperience.aggregationSettingsFlyout.gaugeLabel', {
  defaultMessage: 'Gauge',
});

const histogramLabel = i18n.translate(
  'metricsExperience.aggregationSettingsFlyout.histogramLabel',
  { defaultMessage: 'Histogram percentile' }
);

const buildSimpleAggregationItems = (
  selected: SimpleAggregation,
  dataTestSubjPrefix: string,
  onSelect: (option: SimpleAggregation) => void
): EuiListGroupItemProps[] =>
  SIMPLE_AGGREGATION_OPTIONS.map((option) => ({
    id: option,
    label: option.toUpperCase(),
    isActive: option === selected,
    'aria-pressed': option === selected,
    'data-test-subj': `${dataTestSubjPrefix}-${option}`,
    onClick: () => onSelect(option),
  }));

const buildHistogramPercentileItems = (
  selected: HistogramPercentile,
  onSelect: (option: HistogramPercentile) => void
): EuiListGroupItemProps[] =>
  HISTOGRAM_PERCENTILE_OPTIONS.map((option) => ({
    id: option,
    label: option.toUpperCase(),
    isActive: option === selected,
    'aria-pressed': option === selected,
    'data-test-subj': `metricsExperienceAggregationSettingsHistogramOption-${option}`,
    onClick: () => onSelect(option),
  }));

export const AggregationSettingsFlyout = ({
  aggregationSettings,
  onAggregationSettingsChange,
  onClose,
}: AggregationSettingsFlyoutProps) => {
  const titleId = useGeneratedHtmlId({ prefix: 'metricsAggregationSettingsFlyoutTitle' });

  const counterItems = useMemo(
    () =>
      buildSimpleAggregationItems(
        aggregationSettings.counterAggregation,
        'metricsExperienceAggregationSettingsCounterOption',
        (option) => onAggregationSettingsChange({ counterAggregation: option })
      ),
    [aggregationSettings.counterAggregation, onAggregationSettingsChange]
  );

  const gaugeItems = useMemo(
    () =>
      buildSimpleAggregationItems(
        aggregationSettings.gaugeAggregation,
        'metricsExperienceAggregationSettingsGaugeOption',
        (option) => onAggregationSettingsChange({ gaugeAggregation: option })
      ),
    [aggregationSettings.gaugeAggregation, onAggregationSettingsChange]
  );

  const histogramItems = useMemo(
    () =>
      buildHistogramPercentileItems(aggregationSettings.histogramPercentile, (option) =>
        onAggregationSettingsChange({ histogramPercentile: option })
      ),
    [aggregationSettings.histogramPercentile, onAggregationSettingsChange]
  );

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
          <h2 id={titleId}>{flyoutTitle}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiTitle size="xxs">
          <h3>{counterLabel}</h3>
        </EuiTitle>
        <EuiListGroup
          listItems={counterItems}
          color="primary"
          maxWidth={false}
          data-test-subj="metricsExperienceAggregationSettingsCounterList"
        />
        <EuiSpacer size="m" />
        <EuiTitle size="xxs">
          <h3>{gaugeLabel}</h3>
        </EuiTitle>
        <EuiListGroup
          listItems={gaugeItems}
          color="primary"
          maxWidth={false}
          data-test-subj="metricsExperienceAggregationSettingsGaugeList"
        />
        <EuiSpacer size="m" />
        <EuiTitle size="xxs">
          <h3>{histogramLabel}</h3>
        </EuiTitle>
        <EuiListGroup
          listItems={histogramItems}
          color="primary"
          maxWidth={false}
          data-test-subj="metricsExperienceAggregationSettingsHistogramList"
        />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
