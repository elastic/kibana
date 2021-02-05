/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
// @ts-ignore
import { isMetricEnabled } from '../../lib/check_ui_restrictions';
import { MetricsItemsSchema } from '../../../../common/types';
import { TimeseriesUIRestrictions } from '../../../../common/ui_restrictions';

type AggSelectOption = EuiComboBoxOptionOption;

const metricAggs: AggSelectOption[] = [
  {
    label: i18n.translate('visTypeTimeseries.aggSelect.metricsAggs.averageLabel', {
      defaultMessage: 'Average',
    }),
    value: 'avg',
  },
  {
    label: i18n.translate('visTypeTimeseries.aggSelect.metricsAggs.cardinalityLabel', {
      defaultMessage: 'Cardinality',
    }),
    value: 'cardinality',
  },
  {
    label: i18n.translate('visTypeTimeseries.aggSelect.metricsAggs.countLabel', {
      defaultMessage: 'Count',
    }),
    value: 'count',
  },
  {
    label: i18n.translate('visTypeTimeseries.aggSelect.metricsAggs.filterRatioLabel', {
      defaultMessage: 'Filter Ratio',
    }),
    value: 'filter_ratio',
  },
  {
    label: i18n.translate('visTypeTimeseries.aggSelect.metricsAggs.positiveRateLabel', {
      defaultMessage: 'Counter Rate',
    }),
    value: 'positive_rate',
  },
  {
    label: i18n.translate('visTypeTimeseries.aggSelect.metricsAggs.maxLabel', {
      defaultMessage: 'Max',
    }),
    value: 'max',
  },
  {
    label: i18n.translate('visTypeTimeseries.aggSelect.metricsAggs.minLabel', {
      defaultMessage: 'Min',
    }),
    value: 'min',
  },
  {
    label: i18n.translate('visTypeTimeseries.aggSelect.metricsAggs.percentileLabel', {
      defaultMessage: 'Percentile',
    }),
    value: 'percentile',
  },
  {
    label: i18n.translate('visTypeTimeseries.aggSelect.metricsAggs.percentileRankLabel', {
      defaultMessage: 'Percentile Rank',
    }),
    value: 'percentile_rank',
  },
  {
    label: i18n.translate('visTypeTimeseries.aggSelect.metricsAggs.staticValueLabel', {
      defaultMessage: 'Static Value',
    }),
    value: 'static',
  },
  {
    label: i18n.translate('visTypeTimeseries.aggSelect.metricsAggs.stdDeviationLabel', {
      defaultMessage: 'Std. Deviation',
    }),
    value: 'std_deviation',
  },
  {
    label: i18n.translate('visTypeTimeseries.aggSelect.metricsAggs.sumLabel', {
      defaultMessage: 'Sum',
    }),
    value: 'sum',
  },
  {
    label: i18n.translate('visTypeTimeseries.aggSelect.metricsAggs.sumOfSquaresLabel', {
      defaultMessage: 'Sum of Squares',
    }),
    value: 'sum_of_squares',
  },
  {
    label: i18n.translate('visTypeTimeseries.aggSelect.metricsAggs.topHitLabel', {
      defaultMessage: 'Top Hit',
    }),
    value: 'top_hit',
  },
  {
    label: i18n.translate('visTypeTimeseries.aggSelect.metricsAggs.valueCountLabel', {
      defaultMessage: 'Value Count',
    }),
    value: 'value_count',
  },
  {
    label: i18n.translate('visTypeTimeseries.aggSelect.metricsAggs.varianceLabel', {
      defaultMessage: 'Variance',
    }),
    value: 'variance',
  },
];

const pipelineAggs: AggSelectOption[] = [
  {
    label: i18n.translate('visTypeTimeseries.aggSelect.pipelineAggs.bucketScriptLabel', {
      defaultMessage: 'Bucket Script',
    }),
    value: 'calculation',
  },
  {
    label: i18n.translate('visTypeTimeseries.aggSelect.pipelineAggs.cumulativeSumLabel', {
      defaultMessage: 'Cumulative Sum',
    }),
    value: 'cumulative_sum',
  },
  {
    label: i18n.translate('visTypeTimeseries.aggSelect.pipelineAggs.derivativeLabel', {
      defaultMessage: 'Derivative',
    }),
    value: 'derivative',
  },
  {
    label: i18n.translate('visTypeTimeseries.aggSelect.pipelineAggs.movingAverageLabel', {
      defaultMessage: 'Moving Average',
    }),
    value: 'moving_average',
  },
  {
    label: i18n.translate('visTypeTimeseries.aggSelect.pipelineAggs.positiveOnlyLabel', {
      defaultMessage: 'Positive Only',
    }),
    value: 'positive_only',
  },
  {
    label: i18n.translate('visTypeTimeseries.aggSelect.pipelineAggs.serialDifferenceLabel', {
      defaultMessage: 'Serial Difference',
    }),
    value: 'serial_diff',
  },
];

const siblingAggs: AggSelectOption[] = [
  {
    label: i18n.translate('visTypeTimeseries.aggSelect.siblingAggs.overallAverageLabel', {
      defaultMessage: 'Overall Average',
    }),
    value: 'avg_bucket',
  },
  {
    label: i18n.translate('visTypeTimeseries.aggSelect.siblingAggs.overallMaxLabel', {
      defaultMessage: 'Overall Max',
    }),
    value: 'max_bucket',
  },
  {
    label: i18n.translate('visTypeTimeseries.aggSelect.siblingAggs.overallMinLabel', {
      defaultMessage: 'Overall Min',
    }),
    value: 'min_bucket',
  },
  {
    label: i18n.translate('visTypeTimeseries.aggSelect.siblingAggs.overallStdDeviationLabel', {
      defaultMessage: 'Overall Std. Deviation',
    }),
    value: 'std_deviation_bucket',
  },
  {
    label: i18n.translate('visTypeTimeseries.aggSelect.siblingAggs.overallSumLabel', {
      defaultMessage: 'Overall Sum',
    }),
    value: 'sum_bucket',
  },
  {
    label: i18n.translate('visTypeTimeseries.aggSelect.siblingAggs.overallSumOfSquaresLabel', {
      defaultMessage: 'Overall Sum of Squares',
    }),
    value: 'sum_of_squares_bucket',
  },
  {
    label: i18n.translate('visTypeTimeseries.aggSelect.siblingAggs.overallVarianceLabel', {
      defaultMessage: 'Overall Variance',
    }),
    value: 'variance_bucket',
  },
];

const specialAggs: AggSelectOption[] = [
  {
    label: i18n.translate('visTypeTimeseries.aggSelect.specialAggs.seriesAggLabel', {
      defaultMessage: 'Series Agg',
    }),
    value: 'series_agg',
  },
  {
    label: i18n.translate('visTypeTimeseries.aggSelect.specialAggs.mathLabel', {
      defaultMessage: 'Math',
    }),
    value: 'math',
  },
];

const FILTER_RATIO_AGGS = [
  'avg',
  'cardinality',
  'count',
  'positive_rate',
  'max',
  'min',
  'sum',
  'value_count',
];

const HISTOGRAM_AGGS = ['avg', 'count', 'sum', 'value_count'];

const allAggOptions = [...metricAggs, ...pipelineAggs, ...siblingAggs, ...specialAggs];

function filterByPanelType(panelType: string) {
  return (agg: AggSelectOption) => {
    if (panelType === 'table') return agg.value !== 'series_agg';
    return true;
  };
}

interface AggSelectUiProps {
  id: string;
  panelType: string;
  siblings: MetricsItemsSchema[];
  value: string;
  uiRestrictions?: TimeseriesUIRestrictions;
  onChange: (currentlySelectedOptions: AggSelectOption[]) => void;
}

export function AggSelect(props: AggSelectUiProps) {
  const { siblings, panelType, value, onChange, uiRestrictions, ...rest } = props;

  const selectedOptions = allAggOptions.filter((option) => {
    return value === option.value && isMetricEnabled(option.value, uiRestrictions);
  });

  let enablePipelines = siblings.some((s) => !!metricAggs.find((m) => m.value === s.type));

  if (siblings.length <= 1) enablePipelines = false;

  let options: EuiComboBoxOptionOption[];
  if (panelType === 'metrics') {
    options = metricAggs;
  } else if (panelType === 'filter_ratio') {
    options = metricAggs.filter((m) => FILTER_RATIO_AGGS.includes(`${m.value}`));
  } else if (panelType === 'histogram') {
    options = metricAggs.filter((m) => HISTOGRAM_AGGS.includes(`${m.value}`));
  } else {
    const disableSiblingAggs = (agg: AggSelectOption) => ({
      ...agg,
      disabled: !enablePipelines || !isMetricEnabled(agg.value, uiRestrictions),
    });

    options = [
      {
        label: i18n.translate('visTypeTimeseries.aggSelect.aggGroups.metricAggLabel', {
          defaultMessage: 'Metric Aggregations',
        }),
        options: metricAggs.map((agg) => ({
          ...agg,
          disabled: !isMetricEnabled(agg.value, uiRestrictions),
        })),
      },
      {
        label: i18n.translate('visTypeTimeseries.aggSelect.aggGroups.parentPipelineAggLabel', {
          defaultMessage: 'Parent Pipeline Aggregations',
        }),
        options: pipelineAggs.filter(filterByPanelType(panelType)).map(disableSiblingAggs),
      },
      {
        label: i18n.translate('visTypeTimeseries.aggSelect.aggGroups.siblingPipelineAggLabel', {
          defaultMessage: 'Sibling Pipeline Aggregations',
        }),
        options: siblingAggs.map(disableSiblingAggs),
      },
      {
        label: i18n.translate('visTypeTimeseries.aggSelect.aggGroups.specialAggLabel', {
          defaultMessage: 'Special Aggregations',
        }),
        options: specialAggs.map(disableSiblingAggs),
      },
    ];
  }

  const handleChange = (currentlySelectedOptions: AggSelectOption[]) => {
    if (!currentlySelectedOptions || currentlySelectedOptions.length <= 0) return;
    onChange(currentlySelectedOptions);
  };

  return (
    <div data-test-subj="aggSelector">
      <EuiComboBox
        isClearable={false}
        placeholder={i18n.translate('visTypeTimeseries.aggSelect.selectAggPlaceholder', {
          defaultMessage: 'Select aggregation',
        })}
        options={options}
        selectedOptions={selectedOptions}
        onChange={handleChange}
        singleSelection={{ asPlainText: true }}
        {...rest}
      />
    </div>
  );
}
