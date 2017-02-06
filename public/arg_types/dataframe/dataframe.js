import React from 'react';
import ArgType from 'plugins/rework/arg_types/arg_type';
import argTypes from 'plugins/rework/arg_types/arg_types';
import frameSources from 'plugins/rework/arg_types/dataframe/frame_sources/frame_sources';
import Dataframe from 'plugins/rework/arg_types/dataframe/lib/dataframe';
import Promise from 'bluebird';
import _ from 'lodash';

import FrameLink from './frame_link';

argTypes.push(new ArgType('dataframe', {
  help: 'The source of data to link to this element',
  default: (state) => _.keys(state.persistent.dataframes)[0],
  form: ({commit, value}) => {
    return (<FrameLink value={value} select={commit}></FrameLink>);
  },
  cache: false, // Its ok not to cache this, this is cheap
  resolve: (dataframeId, state) => {
    return state.transient.dataframeCache[dataframeId];
  }
}));
