/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import PropTypes from 'prop-types';
import React from 'react';
import { EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { calculateSiblings } from '../lib/calculate_siblings';
import { calculateLabel } from '../../../../common/calculate_label';
import { basicAggs } from '../../../../common/basic_aggs';
import { toPercentileNumber } from '../../../../common/to_percentile_number';
import { TSVB_METRIC_TYPES } from '../../../../common/enums';

function createTypeFilter(restrict, exclude = []) {
  return (metric) => {
    if (exclude.includes(metric.type)) {
      return false;
    }
    switch (restrict) {
      case 'basic':
        return basicAggs.includes(metric.type);
      default:
        return true;
    }
  };
}

// This filters out sibling aggs, percentiles, and special aggs (like Series Agg)
export function filterRows(includeSiblings) {
  return (row) => {
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

export function MetricSelect(props) {
  const {
    additionalOptions,
    restrict,
    metric,
    fields,
    metrics,
    onChange,
    value,
    exclude,
    includeSiblings,
    clearable,
    ...rest
  } = props;
  const calculatedMetrics = metrics.filter(createTypeFilter(restrict, exclude));

  const siblings = calculateSiblings(calculatedMetrics, metric);

  // Percentiles need to be handled differently because one percentile aggregation
  // could have multiple percentiles associated with it. So the user needs a way
  // to specify which percentile the want to use.
  const percentileOptions = siblings
    .filter((row) => /^percentile/.test(row.type))
    .reduce((acc, row) => {
      const label = calculateLabel(row, calculatedMetrics, fields, false);

      switch (row.type) {
        case TSVB_METRIC_TYPES.PERCENTILE_RANK:
          (row.values || []).forEach((p) => {
            const value = toPercentileNumber(p);

            acc.push({
              value: `${row.id}[${value}]`,
              label: `${label} (${value})`,
            });
          });

        case TSVB_METRIC_TYPES.PERCENTILE:
          (row.percentiles || []).forEach((p) => {
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

  const options = siblings.filter(filterRows(includeSiblings)).map((row) => {
    const label = calculateLabel(row, calculatedMetrics, fields, false);
    return { value: row.id, label };
  });
  const allOptions = [...options, ...additionalOptions, ...percentileOptions];

  const selectedOption = allOptions.find((option) => {
    return value === option.value;
  });
  const selectedOptions = selectedOption ? [selectedOption] : [];

  return (
    <EuiComboBox
      placeholder={i18n.translate('visTypeTimeseries.metricSelect.selectMetricPlaceholder', {
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
