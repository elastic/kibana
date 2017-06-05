import React, { PropTypes } from 'react';
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
    exclude
  } = props;

  const metrics = props.metrics
    .filter(createTypeFilter(restrict, exclude));

  const options = calculateSiblings(metrics, metric)
    .filter(row => !/_bucket$/.test(row.type) && !/^series/.test(row.type))
    .map(row => {
      const label = calculateLabel(row, metrics);
      return { value: row.id, label };
    });

  return (
    <Select
      placeholder="Select metric..."
      options={options.concat(props.additionalOptions)}
      value={value}
      onChange={onChange}/>
  );
}

MetricSelect.defaultProps = {
  additionalOptions: [],
  exclude: [],
  metric: {},
  restrict: 'none',
};

MetricSelect.propTypes = {
  additionalOptions: PropTypes.array,
  exclude: PropTypes.array,
  metric: PropTypes.object,
  onChange: PropTypes.func,
  restrict: PropTypes.string,
  value: PropTypes.string
};

export default MetricSelect;
