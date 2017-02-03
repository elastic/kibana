import React from 'react';
import ArgType from 'plugins/rework/arg_types/arg_type';
import argTypes from 'plugins/rework/arg_types/arg_types';
import {PaletteChooser} from 'plugins/rework/components/palette_chooser/palette_chooser';

argTypes.push(new ArgType('palette', {
  default: ['#45bdb0', '#f2bc33', '#e74b8b', '#4fbf48', '#1ea6dc', '#fd7643'],
  form: ({commit, value, options}) => {
    const palettes =  [
      ['#37988d', '#c19628', '#b83c6f', '#3f9939', '#1785b0', '#ca5f35'],
      ['#45bdb0', '#f2bc33', '#e74b8b', '#4fbf48', '#1ea6dc', '#fd7643'],
      ['#72cec3', '#f5cc5d', '#ec77a8', '#7acf74', '#4cbce4', '#fd986f'],
      ['#a1ded7', '#f8dd91', '#f2a4c5', '#a6dfa2', '#86d2ed', '#fdba9f'],
      ['#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF'],
    ];
    return (<PaletteChooser value={value} options={palettes} onChange={commit}/>);
  },
  resolve: (value, state) => {
    return value;
  }
}));
