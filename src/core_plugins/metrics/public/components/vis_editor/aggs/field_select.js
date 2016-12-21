import _ from 'lodash';
import React from 'react';
import Select from 'react-select';
import AggLookup from '../lib/agg_lookup';
import generateByTypeFilter from '../../../lib/generate_by_type_filter';

export default React.createClass({

  getDefaultProps() {
    return { restrict: 'none', style: {} };
  },

  render() {
    const { type, fields } = this.props;
    if (type === 'count') {
      return (<div style={{ display: 'none' }}/>);
    }
    const options = fields
    .filter(generateByTypeFilter(this.props.restrict))
    .map(field => {
      return { label: field.name, value: field.name };
    });

    return (
      <Select
        placeholder="Select field..."
        options={options}
        value={this.props.value}
        onChange={this.props.onChange}/>
    );
  }
});


