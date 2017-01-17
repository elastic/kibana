import React from 'react';
import ArgType from 'plugins/rework/arg_types/arg_type';
import argTypes from 'plugins/rework/arg_types/arg_types';
import transform from './transform';

argTypes.push(new ArgType('style', {
  default: {},
  help: 'Custom CSS styles to apply to the element.',
  form: ({commit, value}) => {
    const storeValue = (e) => commit(e.target.value);
    return (<textarea className="form-control" onChange={storeValue} value={value}></textarea>);
  },
  resolve: (value) => {
    try {
      return transform(value);
    } catch (e) {
      return {};
    }
  }
}));
