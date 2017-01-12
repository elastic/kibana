import ArgType from 'plugins/rework/arg_types/arg_type';
import argTypes from 'plugins/rework/arg_types/arg_types';

argTypes.push(new ArgType('string', {
  default: '',
  resolve: (value) => {
    return value;
  }
}));
