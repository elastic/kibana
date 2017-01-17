import _ from 'lodash';
import React from 'react';
import Select from 'react-select';
import AggLookup from '../lib/agg_lookup';
import generateByTypeFilter from '../../../lib/generate_by_type_filter';

export default React.createClass({

  getDefaultProps() {
    return {
      indexPattern: '*',
      disabled: false,
      restrict: 'none',
      style: {}
    };
  },

  render() {
    const { type, fields, indexPattern } = this.props;
    if (type === 'count') {
      return (<div style={{ display: 'none' }}/>);
    }
    const options = (fields[indexPattern] || [])
    .filter(generateByTypeFilter(this.props.restrict))
    .map(field => {
      return { label: field.name, value: field.name };
    });

    return (
      <Select
        placeholder="Select field..."
        disabled={this.props.disabled}
        options={options}
        value={this.props.value}
        onChange={this.props.onChange}/>
    );
  }
});


