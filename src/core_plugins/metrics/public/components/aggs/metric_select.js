import PropTypes from 'prop-types';
import React from 'react';
import _ from 'lodash';
import Select from 'react-select';
import calculateSiblings from '../lib/calculate_siblings';
import calculateLabel from '../../../common/calculate_label';
import basicAggs from '../../../common/basic_aggs';

function createTypeFilter(restrict, exclude) {
  return (metric) => {
    if (_.includes(exclude, metric.type)) return false;
    switch (restrict) {
      case 'basic':
        return _.includes(basicAggs, metric.type);
      default:
        return true;
    }
  };
}

function MetricSelect(props) {
  const {
    restrict,
    metric,
    onChange,
    value,
    exclude,
    includeSiblings
  } = props;

  const metrics = props.metrics
    .filter(createTypeFilter(restrict, exclude));

  function metricFilter(row) {
    if (includeSiblings) return !/^series/.test(row.type) && row.type !== 'math';
    return !/_bucket$/.test(row.type) && !/^series/.test(row.type) && row.type !== 'math';
  }

  const options = calculateSiblings(metrics, metric)
    .filter(metricFilter)
    .map(row => {
      const label = calculateLabel(row, metrics);
      return { value: row.id, label };
    });

  return (
    <Select
      aria-label="Select metric"
      placeholder="Select metric..."
      options={options.concat(props.additionalOptions)}
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
  includeSiblings: false
};

MetricSelect.propTypes = {
  additionalOptions: PropTypes.array,
  exclude: PropTypes.array,
  metric: PropTypes.object,
  onChange: PropTypes.func,
  restrict: PropTypes.string,
  value: PropTypes.string,
  includeSiblings: PropTypes.bool
};

export default MetricSelect;
