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
import { includes } from 'lodash';
import { injectI18n } from '@kbn/i18n/react';
import { EuiComboBox } from '@elastic/eui';
import { calculateSiblings } from '../lib/calculate_siblings';
import { calculateLabel } from '../../../common/calculate_label';
import { basicAggs } from '../../../common/basic_aggs';
import { toPercentileNumber } from '../../../common/to_percentile_number';
import { METRIC_TYPES } from '../../../common/metric_types';

function createTypeFilter(restrict, exclude) {
  return metric => {
    if (includes(exclude, metric.type)) return false;
    switch (restrict) {
      case 'basic':
        return includes(basicAggs, metric.type);
      default:
        return true;
    }
  };
}

// This filters out sibling aggs, percentiles, and special aggs (like Series Agg)
export function filterRows(includeSiblings) {
  return row => {
    if (includeSiblings) {
      return !/^series/.test(row.type) && !/^percentile/.test(row.type) && row.type !== 'math';
    }
    return (
      !/_bucket$/.test(row.type) &&
      !/^series/.test(row.type) &&
      !/^percentile/.test(row.type) &&
      row.type !== 'math'
    );
  };
}

function MetricSelectUi(props) {
  const {
    additionalOptions,
    restrict,
    metric,
    metrics,
    onChange,
    value,
    exclude,
    includeSiblings,
    clearable,
    intl,
    ...rest
  } = props;

  const calculatedMetrics = metrics.filter(createTypeFilter(restrict, exclude));

  const siblings = calculateSiblings(calculatedMetrics, metric);

  // Percentiles need to be handled differently because one percentile aggregation
  // could have multiple percentiles associated with it. So the user needs a way
  // to specify which percentile the want to use.
  const percentileOptions = siblings
    .filter(row => /^percentile/.test(row.type))
    .reduce((acc, row) => {
      const label = calculateLabel(row, calculatedMetrics);

      switch (row.type) {
        case METRIC_TYPES.PERCENTILE_RANK:
          (row.values || []).forEach(p => {
            const value = toPercentileNumber(p);

            acc.push({
              value: `${row.id}[${value}]`,
              label: `${label} (${value})`,
            });
          });

        case METRIC_TYPES.PERCENTILE:
          (row.percentiles || []).forEach(p => {
            if (p.value) {
              const value = toPercentileNumber(p.value);

              acc.push({
                value: `${row.id}[${value}]`,
                label: `${label} (${value})`,
              });
            }
          });
      }

      return acc;
    }, []);

  const options = siblings.filter(filterRows(includeSiblings)).map(row => {
    const label = calculateLabel(row, calculatedMetrics);
    return { value: row.id, label };
  });
  const allOptions = [...options, ...additionalOptions, ...percentileOptions];

  const selectedOption = allOptions.find(option => {
    return value === option.value;
  });
  const selectedOptions = selectedOption ? [selectedOption] : [];

  return (
    <EuiComboBox
      placeholder={intl.formatMessage({
        id: 'visTypeTimeseries.metricSelect.selectMetricPlaceholder',
        defaultMessage: 'Select metric…',
      })}
      options={allOptions}
      selectedOptions={selectedOptions}
      onChange={onChange}
      singleSelection={{ asPlainText: true }}
      isClearable={clearable}
      {...rest}
    />
  );
}

MetricSelectUi.defaultProps = {
  additionalOptions: [],
  exclude: [],
  metric: {},
  restrict: 'none',
  includeSiblings: false,
};

MetricSelectUi.propTypes = {
  additionalOptions: PropTypes.array,
  exclude: PropTypes.array,
  metric: PropTypes.object,
  onChange: PropTypes.func,
  restrict: PropTypes.string,
  value: PropTypes.string,
  includeSiblings: PropTypes.bool,
};

export const MetricSelect = injectI18n(MetricSelectUi);
