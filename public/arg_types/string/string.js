import React from 'react';
import ArgType from 'plugins/rework/arg_types/arg_type';
import argTypes from 'plugins/rework/arg_types/arg_types';

argTypes.push(new ArgType('string', {
  default: '',
  form: ({commit, value}) => {
    const storeValue = (e) => commit(e.target.value);
    return (<input className="form-control" onChange={storeValue} value={value}></input>);
  },
  resolve: (value, state) => {
    return value;
  }
}));
