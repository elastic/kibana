import React from 'react';
import ArgType from 'plugins/rework/arg_types/arg_type';
import argTypes from 'plugins/rework/arg_types/arg_types';
import transform from './transform';

argTypes.push(new ArgType('style', {
  default: '',
  help: 'Custom CSS styles to apply to the element.',
  /*
    value = current value,
    commit = function to call to commit changes,
  */
  form: ({value, commit}) => {
    const storeValue = (e) => commit(e.target.value);
    return (<textarea className="form-control" rows={10} onChange={storeValue} value={value}></textarea>);
  },
  /*
    value = current value,
    state = current redux state
  */
  resolve: (value, state) => value
}));
