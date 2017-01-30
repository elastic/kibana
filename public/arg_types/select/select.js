import React from 'react';
import ArgType from 'plugins/rework/arg_types/arg_type';
import argTypes from 'plugins/rework/arg_types/arg_types';
import _ from 'lodash';

argTypes.push(new ArgType('select', {
  default: '', // Wouldn't make sense to have a default, better set one in your arg
  form: ({commit, value, options}) => {
    const storeValue = (e) => commit(e.target.value);

    const opts = _.map(options.choices, choice => (
      <option key={choice} value={choice}>{choice}</option>
    ));

    return (<select className="form-control" onChange={storeValue} value={value}>{opts}</select>);
  },
  resolve: (value, state) => {
    return value;
  }
}));
