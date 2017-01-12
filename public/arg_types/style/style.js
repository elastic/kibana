import ArgType from 'plugins/rework/arg_types/arg_type';
import argTypes from 'plugins/rework/arg_types/arg_types';

argTypes.push(new ArgType('style', {
  default: {},
  resolve: (value) => {
    return {border: '5px solid #000'};
  }
}));
