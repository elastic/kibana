import { View } from '../view';
import { Arg } from '../arg';
import { getState, getValue } from '../../lib/resolved_arg';
import { map, uniq } from 'lodash';

const styleProps = ['lines', 'bars', 'points', 'fill', 'stack'];

export const plot = () => new View('plot', {
  displayName: 'Plot Chart',
  description: 'Show your data, as plots',
  modelArgs: ['x', 'y', 'color', 'size', 'text'],
  args: [
    new Arg('palette', {
      displayName: 'Color palette',
      argType: 'palette',
    }),
    new Arg('font', {
      displayName: 'Text settings',
      description: 'Fonts, alignment and color',
      argType: 'font',
    }),
    new Arg('defaultStyle', {
      displayName: 'Default style',
      description: 'Set the style to be used by default by every series, unless overridden.',
      argType: 'seriesStyle',
      defaultValue: '{seriesStyle points=5}',
      options: {
        include: styleProps,
      },
    }),
    new Arg('seriesStyle', {
      displayName: 'Series style',
      argType: 'seriesStyle',
      defaultValue: '{seriesStyle points=5}',
      options: {
        include: styleProps,
      },
      multi: true,
    }),
  ],
  resolve({ context }) {
    if (getState(context) !== 'ready') return { labels: [] };
    return { labels: uniq(map(getValue(context).rows, 'color').filter(v => v !== undefined)) };
  },
});
