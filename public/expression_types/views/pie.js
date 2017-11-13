import { getState, getValue } from '../../lib/resolved_arg';
import { map, uniq } from 'lodash';

export const pie = () => ({
  name: 'pie',
  displayName: 'Chart Style',
  modelArgs: [['color', { label: 'Slice Labels' }], ['size', { label: 'Slice Angles' }]],
  args: [{
    name: 'font',
    displayName: 'Text settings',
    help: 'Fonts, alignment and color',
    argType: 'font',
  }, {
    name: 'palette',
    displayName: 'Color palette',
    argType: 'palette',
  }, {
    name: 'seriesStyle',
    displayName: 'Series Style',
    help: 'Set the color of a specific slice, expand to select series',
    argType: 'seriesStyle',
    default: '{seriesStyle}',
    multi: true,
  }],
  resolve({ context }) {
    if (getState(context) !== 'ready') return { labels: [] };
    return { labels: uniq(map(getValue(context).rows, 'color').filter(v => v !== undefined)) };
  },
});
