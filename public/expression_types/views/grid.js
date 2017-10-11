import { View } from '../view';
import { Arg } from '../arg';
import { getState, getValue } from '../../lib/resolved_arg';
import { map, uniq } from 'lodash';

export const grid = () => new View('grid', {
  displayName: 'Chart Style',
  description: '',
  modelArgs: ['x', 'y', 'color', 'size', 'text'],
  args: [
    new Arg('mark', {
      displayName: 'Mark Shape',
      argType: 'shape',
      defaultValue: 'circle',
    }),
    new Arg('font', {
      displayName: 'Text settings',
      description: 'Fonts, alignment and color',
      argType: 'font',
    }),
    new Arg('palette', {
      displayName: 'Palette',
      argType: 'palette',
    }),
    new Arg('seriesStyle', {
      displayName: 'Series Style',
      argType: 'seriesStyle',
      defaultValue: '{seriesStyle points=5}',
      multi: true,
    }),
  ],
  resolve: ({ context }) => {
    if (getState(context) !== 'ready') return { labels: [] };

    return {
      labels: uniq(map(getValue(context).rows, 'color').filter(v => v !== undefined)),
    };
  },
});
