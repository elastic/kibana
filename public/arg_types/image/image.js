import React from 'react';
import ArgType from 'plugins/rework/arg_types/arg_type';
import argTypes from 'plugins/rework/arg_types/arg_types';
import {ImageUpload} from 'plugins/rework/components/image_upload/image_upload';

argTypes.push(new ArgType('image', {
  default: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiA' +
            'xNiI+PHBhdGggZD0iTTggMkE0IDQgMCAwIDAgNCA2SDVBMyAzIDAgMCAxIDggMyAzIDMgMCAwIDEgMTEgNiAzIDMgMCAwIDEgOCA5SDdWMTJI' +
            'OFYxMEE0IDQgMCAwIDAgMTIgNiA0IDQgMCAwIDAgOCAyTTcgMTNWMTRIOFYxM0g3IiBmaWxsPSIjNGQ0ZDRkIi8+PC9zdmc+',
  form: ({commit, value, options}) => (
    <ImageUpload onChange={commit} value={value}/>
  ),
  resolve: (value, state) => {
    return value;
  }
}));
