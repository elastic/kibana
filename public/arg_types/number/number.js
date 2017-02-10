import React from 'react';
import ArgType from 'plugins/rework/arg_types/arg_type';
import argTypes from 'plugins/rework/arg_types/arg_types';

argTypes.push(new ArgType('number', {
  default: 0,
  form: ({commit, value, options}) => {
    options = options || {};
    const storeValue = (e) => commit(Number(e.target.value));
    return (
      <input
        className="form-control"
        min={options.min}
        max={options.max}
        type="number"
        onChange={storeValue}
        value={value}/>
      );
  },
  resolve: (value, state) => {
    return value;
  }
}));
