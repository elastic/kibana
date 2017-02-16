import React from 'react';
import _ from 'lodash';
import ArgType from 'plugins/rework/arg_types/arg_type';
import argTypes from 'plugins/rework/arg_types/arg_types';
import FrameLink from 'plugins/rework/arg_types/dataframe/frame_link';

argTypes.push(new ArgType('dataframe', {
  help: 'The source of data to link to this element',
  cache: false, // Its ok not to cache this, this is cheap
  default(state) { return _.keys(state.persistent.dataframes)[0]; },
  form({commit, value, options}) {
    return (<FrameLink types={options.types} value={value} select={commit}></FrameLink>);
  },
  resolve(dataframeId, state) {
    return state.transient.dataframeCache[dataframeId];
  }
}));
