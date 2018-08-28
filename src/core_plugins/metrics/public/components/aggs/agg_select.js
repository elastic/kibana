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
import {
  EuiComboBox,
} from '@elastic/eui';

const metricAggs = [
  { label: 'Average', value: 'avg' },
  { label: 'Cardinality', value: 'cardinality' },
  { label: 'Count', value: 'count' },
  { label: 'Filter Ratio', value: 'filter_ratio' },
  { label: 'Max', value: 'max' },
  { label: 'Min', value: 'min' },
  { label: 'Percentile', value: 'percentile' },
  { label: 'Percentile Rank', value: 'percentile_rank' },
  { label: 'Static Value', value: 'static' },
  { label: 'Std. Deviation', value: 'std_deviation' },
  { label: 'Sum', value: 'sum' },
  { label: 'Sum of Squares', value: 'sum_of_squares' },
  { label: 'Top Hit', value: 'top_hit' },
  { label: 'Value Count', value: 'value_count' },
  { label: 'Variance', value: 'variance' },
];

const pipelineAggs = [
  { label: 'Bucket Script', value: 'calculation' },
  { label: 'Cumulative Sum', value: 'cumulative_sum' },
  { label: 'Derivative', value: 'derivative' },
  { label: 'Moving Average', value: 'moving_average' },
  { label: 'Positive Only', value: 'positive_only' },
  { label: 'Serial Difference', value: 'serial_diff' },
];

const siblingAggs = [
  { label: 'Overall Average', value: 'avg_bucket' },
  { label: 'Overall Max', value: 'max_bucket' },
  { label: 'Overall Min', value: 'min_bucket' },
  { label: 'Overall Std. Deviation', value: 'std_deviation_bucket' },
  { label: 'Overall Sum', value: 'sum_bucket' },
  { label: 'Overall Sum of Squares', value: 'sum_of_squares_bucket' },
  { label: 'Overall Variance', value: 'variance_bucket' },
];

const specialAggs = [
  { label: 'Series Agg', value: 'series_agg' },
  { label: 'Math', value: 'math' },
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

function AggSelect(props) {
  const { siblings, panelType, value } = props;

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
        label: 'Metric Aggregations',
        options: metricAggs,
      },
      {
        label: 'Parent Pipeline Aggregations',
        options: pipelineAggs
          .filter(filterByPanelType(panelType))
          .map(agg => ({ ...agg, disabled: !enablePipelines }))
      },
      {
        label: 'Sibling Pipeline Aggregations',
        options: siblingAggs.map(agg => ({ ...agg, disabled: !enablePipelines })),
      },
      {
        label: 'Special Aggregations',
        options: specialAggs.map(agg => ({ ...agg, disabled: !enablePipelines })),
      },
    ];
  }

  const handleChange = selectedOptions => {
    if (!selectedOptions || selectedOptions.length <= 0) return;
    props.onChange(selectedOptions);
  };

  return (
    <div data-test-subj="aggSelector" className="vis_editor__row_item">
      <EuiComboBox
        isClearable={false}
        placeholder="Select aggregation"
        options={options}
        selectedOptions={selectedOptions}
        onChange={handleChange}
        singleSelection={true}
      />
    </div>
  );
}

AggSelect.propTypes = {
  onChange: PropTypes.func,
  panelType: PropTypes.string,
  siblings: PropTypes.array,
  value: PropTypes.string,
};

export default AggSelect;
