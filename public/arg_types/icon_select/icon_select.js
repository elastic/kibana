import React from 'react';
import ArgType from 'plugins/rework/arg_types/arg_type';
import argTypes from 'plugins/rework/arg_types/arg_types';
import IconSelect from 'plugins/rework/components/icon_select/icon_select';
import _ from 'lodash';

argTypes.push(new ArgType('icon_select', {
  default: '', // Wouldn't make sense to have a default, better set one in your arg
  form: ({commit, value, options}) => {
    return (<IconSelect options={options.choices} onSelect={commit} value={value}/>);
  },
  resolve: (value, state) => {
    return value;
  }
}));
