import React from 'react';
import ArgType from 'plugins/rework/arg_types/arg_type';
import argTypes from 'plugins/rework/arg_types/arg_types';
import {ImageUpload} from 'plugins/rework/components/image_upload/image_upload';

argTypes.push(new ArgType('image', {
  default: '',
  form: ({commit, value, options}) => (
    <ImageUpload onChange={commit} value={value}/>
  ),
  resolve: (value, state) => {
    return value;
  }
}));
