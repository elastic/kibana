import React from 'react';
import ArgType from 'plugins/rework/arg_types/arg_type';
import argTypes from 'plugins/rework/arg_types/arg_types';
import ColumnLink from './column_link';

/*

  TODO: It makes more sense to link this to redux than the ColumnLink component.

  Options:
   - dataframeArg: The name of the dataframe argument to link to. Defaults to 'dataframe'

*/

argTypes.push(new ArgType('dataframe_column', {
  default: '',
  form: ({value, commit, context, options}) => {
    return (
      <ColumnLink
        onChange={commit}
        value={value}
        dataframeId={context[options.dataframeArg || 'dataframe']}>

      </ColumnLink>
    );
  },
  resolve: (value, state) => {
    return value;
  }
}));
