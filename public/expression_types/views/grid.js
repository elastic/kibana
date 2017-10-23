import { getState, getValue } from '../../lib/resolved_arg';
import { map, uniq } from 'lodash';

export const grid = () => ({
  name: 'grid',
  displayName: 'Chart Style',
  description: '',
  modelArgs: ['x', 'y', 'color', 'size', 'text'],
  args: [{
    name: 'mark',
    displayName: 'Mark Shape',
    argType: 'shape',
    defaultValue: 'circle',
  }, {
    name: 'font',
    displayName: 'Text settings',
    description: 'Fonts, alignment and color',
    argType: 'font',
  }, {
    name: 'palette',
    displayName: 'Palette',
    argType: 'palette',
  }, {
    name: 'seriesStyle',
    displayName: 'Series Style',
    argType: 'seriesStyle',
    defaultValue: '{seriesStyle points=5}',
    multi: true,
  }],
  resolve: ({ context }) => {
    if (getState(context) !== 'ready') return { labels: [] };

    return {
      labels: uniq(map(getValue(context).rows, 'color').filter(v => v !== undefined)),
    };
  },
});
