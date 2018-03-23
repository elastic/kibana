import PropTypes from 'prop-types';
import React from 'react';
import _ from 'lodash';
import Select from 'react-select';
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

  return (
    <Select
      aria-label="Select metric"
      placeholder="Select metric..."
      options={[...options, ...props.additionalOptions, ...percentileOptions]}
      value={value}
      onChange={onChange}
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
