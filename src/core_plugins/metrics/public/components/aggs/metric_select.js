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
import _ from 'lodash';
import {
  EuiComboBox,
} from '@elastic/eui';
import calculateSiblings from '../lib/calculate_siblings';
import calculateLabel from '../../../common/calculate_label';
import basicAggs from '../../../common/basic_aggs';

function createTypeFilter(restrict, exclude) {
  return metric => {
    if (_.includes(exclude, metric.type)) return false;
    switch (restrict) {
      case 'basic':
        return _.includes(basicAggs, metric.type);
      default:
        return true;
    }
  };
}

// This filters out sibling aggs, percentiles, and special aggs (like Series Agg)
export function filterRows(includeSiblings) {
  return row => {
    if (includeSiblings) {
      return (
        !/^series/.test(row.type) &&
        !/^percentile/.test(row.type) &&
        row.type !== 'math'
      );
    }
    return (
      !/_bucket$/.test(row.type) &&
      !/^series/.test(row.type) &&
      !/^percentile/.test(row.type) &&
      row.type !== 'math'
    );
  };
}

function MetricSelect(props) {
  const { restrict, metric, onChange, value, exclude, includeSiblings } = props;

  const metrics = props.metrics.filter(createTypeFilter(restrict, exclude));

  const siblings = calculateSiblings(metrics, metric);

  // Percentiles need to be handled differently because one percentile aggregation
  // could have multiple percentiles associated with it. So the user needs a way
  // to specify which percentile the want to use.
  const percentileOptions = siblings
    .filter(row => /^percentile/.test(row.type))
    .reduce((acc, row) => {
      const label = calculateLabel(row, metrics);
      row.percentiles.forEach(p => {
        if (p.value) {
          const value = /\./.test(p.value) ? p.value : `${p.value}.0`;
          acc.push({
            value: `${row.id}[${value}]`,
            label: `${label} (${value})`,
          });
        }
      });
      return acc;
    }, []);

  const options = siblings.filter(filterRows(includeSiblings)).map(row => {
    const label = calculateLabel(row, metrics);
    return { value: row.id, label };
  });
  const allOptions = [...options, ...props.additionalOptions, ...percentileOptions];

  const selectedOption = allOptions.find(option => {
    return value === option.value;
  });
  const selectedOptions = selectedOption ? [selectedOption] : [];

  return (
    <EuiComboBox
      placeholder="Select metric..."
      options={allOptions}
      selectedOptions={selectedOptions}
      onChange={onChange}
      singleSelection={true}
    />
  );
}

MetricSelect.defaultProps = {
  additionalOptions: [],
  exclude: [],
  metric: {},
  restrict: 'none',
  includeSiblings: false,
};

MetricSelect.propTypes = {
  additionalOptions: PropTypes.array,
  exclude: PropTypes.array,
  metric: PropTypes.object,
  onChange: PropTypes.func,
  restrict: PropTypes.string,
  value: PropTypes.string,
  includeSiblings: PropTypes.bool,
};

export default MetricSelect;
