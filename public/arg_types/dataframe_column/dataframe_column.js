import React from 'react';
import ArgType from 'plugins/rework/arg_types/arg_type';
import argTypes from 'plugins/rework/arg_types/arg_types';
import ColumnLink from './column_link';

argTypes.push(new ArgType('dataframe_column', {
  default: '',
  form: ({value, commit, context}) => {
    return (<ColumnLink onChange={commit} value={value} dataframeId={context.dataframe}></ColumnLink>);
  },
  resolve: (value, state) => {
    return value;
  }
}));
