import React from 'react';
import ArgType from 'plugins/rework/arg_types/arg_type';
import argTypes from 'plugins/rework/arg_types/arg_types';
import frameSources from 'plugins/rework/arg_types/dataframe/frame_sources/frame_sources';
import Dataframe from 'plugins/rework/arg_types/dataframe/lib/dataframe';
import _ from 'lodash';

import FrameLink from './frame_link';

argTypes.push(new ArgType('dataframe', {
  help: 'The source of data to link to this element',
  form: ({commit, value}) => {
    return (<FrameLink value={value} select={commit}></FrameLink>);
  },
  cache: false, // Its ok not to cache this, this is cheap
  resolve: (dataframeId, state) => {
    const {dataframeCache} = state.transient;

    if (!dataframeCache[dataframeId]) {
      // TODO: Remove this time filter hack
      const time = state.persistent.workpad.time;
      const filters = [{id: 'globalTimeFilter', type: 'time', value: time}];

      // TODO You're double resolving dataframes, this is bad! This is also done in the event
      // but you need a way to wait for the event to finish, gross.
      const dataframe = state.persistent.dataframes[dataframeId];
      const toDataframe = frameSources.byName[dataframe.type].toDataframe;
      return Promise.resolve(toDataframe(dataframe.value, filters));
    } else {
      return dataframeCache[dataframeId];
    }
  }
}));
