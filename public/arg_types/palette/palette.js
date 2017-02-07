import React from 'react';
import ArgType from 'plugins/rework/arg_types/arg_type';
import argTypes from 'plugins/rework/arg_types/arg_types';
import {PaletteChooser} from 'plugins/rework/components/palette_chooser/palette_chooser';
import tinygradient from 'tinygradient';
import _ from 'lodash';

argTypes.push(new ArgType('palette', {
  default: {type: 'flot', seed: ['#45bdb0', '#f2bc33', '#e74b8b', '#4fbf48', '#1ea6dc', '#fd7643']},
  form: ({commit, value, options}) => {
    const palettes =  [
      {type: 'flot', seed: ['#37988d', '#c19628', '#b83c6f', '#3f9939', '#1785b0', '#ca5f35']},
      {type: 'flot', seed: ['#45bdb0', '#f2bc33', '#e74b8b', '#4fbf48', '#1ea6dc', '#fd7643']},
      {type: 'flot', seed: ['#72cec3', '#f5cc5d', '#ec77a8', '#7acf74', '#4cbce4', '#fd986f']},
      {type: 'flot', seed: ['#a1ded7', '#f8dd91', '#f2a4c5', '#a6dfa2', '#86d2ed', '#fdba9f']},

      // Gradients
      {type: 'gradient', seed: ['#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#eeeeee']},
      {type: 'gradient', seed: ['#37988d', '#45bdb0', '#72cec3', '#a1ded7']},
      {type: 'gradient', seed: ['#c19628', '#f2bc33', '#f5cc5d', '#f8dd91']},
      {type: 'gradient', seed: ['#b83c6f', '#e74b8b', '#ec77a8', '#f2a4c5']},
      {type: 'gradient', seed: ['#3f9939', '#4fbf48', '#7acf74', '#a6dfa2']},
      {type: 'gradient', seed: ['#1785b0', '#1ea6dc', '#4cbce4', '#86d2ed']},
      {type: 'gradient', seed: ['#ca5f35', '#fd7643', '#fd986f', '#fdba9f']},

    ];
    return (<PaletteChooser value={value} options={palettes} onChange={commit}/>);
  },
  resolve: (value, state) => {
    switch (value.type) {
      case 'gradient':
        return (count) => {
          const gradientLength = count < 2 ? 3 : count;
          const tinyColors = tinygradient([_.first(value.seed), _.last(value.seed)]).rgb(gradientLength);
          const colors = _.map(tinyColors, tinyColor =>
            tinyColor.toHexString());

          return count < 2 ? [colors[1]] : colors;
        };
        break;
      default:
        // TODO: Update this to actually generate colors
        return (count) => value.seed;

    }
    return value;
  }
}));
