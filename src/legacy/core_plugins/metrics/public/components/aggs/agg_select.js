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

import PropTypes from 'prop-types';
import React from 'react';
import { EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { injectI18n } from '@kbn/i18n/react';

const metricAggs = [
  {
    label: i18n.translate('tsvb.aggSelect.metricsAggs.averageLabel', { defaultMessage: 'Average' }),
    value: 'avg',
  },
  {
    label: i18n.translate('tsvb.aggSelect.metricsAggs.cardinalityLabel', { defaultMessage: 'Cardinality' }),
    value: 'cardinality',
  },
  {
    label: i18n.translate('tsvb.aggSelect.metricsAggs.countLabel', { defaultMessage: 'Count' }),
    value: 'count'
  },
  {
    label: i18n.translate('tsvb.aggSelect.metricsAggs.filterRatioLabel', { defaultMessage: 'Filter Ratio' }),
    value: 'filter_ratio'
  },
  {
    label: i18n.translate('tsvb.aggSelect.metricsAggs.maxLabel', { defaultMessage: 'Max' }),
    value: 'max'
  },
  {
    label: i18n.translate('tsvb.aggSelect.metricsAggs.minLabel', { defaultMessage: 'Min' }),
    value: 'min'
  },
  {
    label: i18n.translate('tsvb.aggSelect.metricsAggs.percentileLabel', { defaultMessage: 'Percentile' }),
    value: 'percentile'
  },
  {
    label: i18n.translate('tsvb.aggSelect.metricsAggs.percentileRankLabel', { defaultMessage: 'Percentile Rank' }),
    value: 'percentile_rank'
  },
  {
    label: i18n.translate('tsvb.aggSelect.metricsAggs.staticValueLabel', { defaultMessage: 'Static Value' }),
    value: 'static'
  },
  {
    label: i18n.translate('tsvb.aggSelect.metricsAggs.stdDeviationLabel', { defaultMessage: 'Std. Deviation' }),
    value: 'std_deviation'
  },
  {
    label: i18n.translate('tsvb.aggSelect.metricsAggs.sumLabel', { defaultMessage: 'Sum' }),
    value: 'sum'
  },
  {
    label: i18n.translate('tsvb.aggSelect.metricsAggs.sumOfSquaresLabel', { defaultMessage: 'Sum of Squares' }),
    value: 'sum_of_squares'
  },
  {
    label: i18n.translate('tsvb.aggSelect.metricsAggs.topHitLabel', { defaultMessage: 'Top Hit' }),
    value: 'top_hit'
  },
  {
    label: i18n.translate('tsvb.aggSelect.metricsAggs.valueCountLabel', { defaultMessage: 'Value Count' }),
    value: 'value_count'
  },
  {
    label: i18n.translate('tsvb.aggSelect.metricsAggs.varianceLabel', { defaultMessage: 'Variance' }),
    value: 'variance'
  },
];

const pipelineAggs = [
  {
    label: i18n.translate('tsvb.aggSelect.pipelineAggs.bucketScriptLabel', { defaultMessage: 'Bucket Script' }),
    value: 'calculation'
  },
  {
    label: i18n.translate('tsvb.aggSelect.pipelineAggs.cumulativeSumLabel', { defaultMessage: 'Cumulative Sum' }),
    value: 'cumulative_sum'
  },
  {
    label: i18n.translate('tsvb.aggSelect.pipelineAggs.derivativeLabel', { defaultMessage: 'Derivative' }),
    value: 'derivative'
  },
  {
    label: i18n.translate('tsvb.aggSelect.pipelineAggs.movingAverageLabel', { defaultMessage: 'Moving Average' }),
    value: 'moving_average'
  },
  {
    label: i18n.translate('tsvb.aggSelect.pipelineAggs.positiveOnlyLabel', { defaultMessage: 'Positive Only' }),
    value: 'positive_only'
  },
  {
    label: i18n.translate('tsvb.aggSelect.pipelineAggs.serialDifferenceLabel', { defaultMessage: 'Serial Difference' }),
    value: 'serial_diff'
  },
];

const siblingAggs = [
  {
    label: i18n.translate('tsvb.aggSelect.siblingAggs.overallAverageLabel', { defaultMessage: 'Overall Average' }),
    value: 'avg_bucket' },
  {
    label: i18n.translate('tsvb.aggSelect.siblingAggs.overallMaxLabel', { defaultMessage: 'Overall Max' }),
    value: 'max_bucket'
  },
  {
    label: i18n.translate('tsvb.aggSelect.siblingAggs.overallMinLabel', { defaultMessage: 'Overall Min' }),
    value: 'min_bucket'
  },
  {
    label: i18n.translate('tsvb.aggSelect.siblingAggs.overallStdDeviationLabel', { defaultMessage: 'Overall Std. Deviation' }),
    value: 'std_deviation_bucket'
  },
  {
    label: i18n.translate('tsvb.aggSelect.siblingAggs.overallSumLabel', { defaultMessage: 'Overall Sum' }),
    value: 'sum_bucket'
  },
  {
    label: i18n.translate('tsvb.aggSelect.siblingAggs.overallSumOfSquaresLabel', { defaultMessage: 'Overall Sum of Squares' }),
    value: 'sum_of_squares_bucket'
  },
  {
    label: i18n.translate('tsvb.aggSelect.siblingAggs.overallVarianceLabel', { defaultMessage: 'Overall Variance' }),
    value: 'variance_bucket'
  },
];

const specialAggs = [
  {
    label: i18n.translate('tsvb.aggSelect.specialAggs.seriesAggLabel', { defaultMessage: 'Series Agg' }),
    value: 'series_agg'
  },
  {
    label: i18n.translate('tsvb.aggSelect.specialAggs.mathLabel', { defaultMessage: 'Math' }),
    value: 'math'
  },
];

const allAggOptions = [
  ...metricAggs,
  ...pipelineAggs,
  ...siblingAggs,
  ...specialAggs
];

function filterByPanelType(panelType) {
  return agg => {
    if (panelType === 'table') return agg.value !== 'series_agg';
    return true;
  };
}

function AggSelectUi(props) {
  const { siblings, panelType, value, onChange, intl, ...rest } = props;
  const selectedOption = allAggOptions.find(option => {
    return value === option.value;
  });
  const selectedOptions = selectedOption ? [selectedOption] : [];

  let enablePipelines = siblings.some(
    s => !!metricAggs.find(m => m.value === s.type)
  );
  if (siblings.length <= 1) enablePipelines = false;

  let options;
  if (panelType === 'metrics') {
    options = metricAggs;
  } else {
    options = [
      {
        label: intl.formatMessage({ id: 'tsvb.aggSelect.aggGroups.metricAggLabel', defaultMessage: 'Metric Aggregations' }),
        options: metricAggs,
      },
      {
        label: intl.formatMessage({
          id: 'tsvb.aggSelect.aggGroups.parentPipelineAggLabel', defaultMessage: 'Parent Pipeline Aggregations' }),
        options: pipelineAggs
          .filter(filterByPanelType(panelType))
          .map(agg => ({ ...agg, disabled: !enablePipelines })),
      },
      {
        label: intl.formatMessage({
          id: 'tsvb.aggSelect.aggGroups.siblingPipelineAggLabel', defaultMessage: 'Sibling Pipeline Aggregations' }),
        options: siblingAggs.map(agg => ({ ...agg, disabled: !enablePipelines })),
      },
      {
        label: intl.formatMessage({ id: 'tsvb.aggSelect.aggGroups.specialAggLabel', defaultMessage: 'Special Aggregations' }),
        options: specialAggs.map(agg => ({ ...agg, disabled: !enablePipelines })),
      },
    ];
  }

  const handleChange = selectedOptions => {
    if (!selectedOptions || selectedOptions.length <= 0) return;
    onChange(selectedOptions);
  };

  return (
    <div data-test-subj="aggSelector">
      <EuiComboBox
        isClearable={false}
        placeholder={intl.formatMessage({ id: 'tsvb.aggSelect.selectAggPlaceholder', defaultMessage: 'Select aggregation' })}
        options={options}
        selectedOptions={selectedOptions}
        onChange={handleChange}
        singleSelection={{ asPlainText: true }}
        {...rest}
      />
    </div>
  );
}

AggSelectUi.propTypes = {
  onChange: PropTypes.func,
  panelType: PropTypes.string,
  siblings: PropTypes.array,
  value: PropTypes.string,
};

const AggSelect = injectI18n(AggSelectUi);
export default AggSelect;
