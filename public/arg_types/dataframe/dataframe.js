import React from 'react';
import ArgType from 'plugins/rework/arg_types/arg_type';
import argTypes from 'plugins/rework/arg_types/arg_types';
import frameSources from 'plugins/rework/arg_types/dataframe/frame_sources/frame_sources';
import Dataframe from 'plugins/rework/arg_types/dataframe/lib/dataframe';

import FrameLink from './frame_link';

argTypes.push(new ArgType('dataframe', {
  default: '',
  help: 'The source of data to link to this element',
  form: ({commit, value}) => {
    const storeValue = (e) => commit(e.target.value);
    return (<FrameLink value={value} select={storeValue}></FrameLink>);
  },
  resolve: (value, state) => {
    const unresolvedFrame = state.persistent.storage.dataframes[value];

    if (!unresolvedFrame) return {type: 'dataframe', columns: [], rows: []};

    const type = unresolvedFrame.type;
    const frameSource = frameSources.byName[type];

    return frameSource.toDataframe(unresolvedFrame.value);
  }
}));
