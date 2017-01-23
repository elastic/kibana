import React from 'react';
import _ from 'lodash';
import Select from 'react-select';
import calculateSiblings from '../lib/calculate_siblings';
import calculateLabel from '../lib/calculate_label';
import basicAggs from '../lib/basic_aggs';

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

export default React.createClass({

  getDefaultProps() {
    return {
      metric: {},
      restrict: 'none',
      exclude: [],
      additionalOptions: [],
      style: {}
    };
  },

  render() {
    const {
      restrict,
      metric,
      onChange,
      value,
      exclude
    } = this.props;

    const metrics = this.props.metrics
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
        options={options.concat(this.props.additionalOptions)}
        value={value}
        onChange={onChange}/>
    );
  }
});
