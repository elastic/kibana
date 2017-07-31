import { View } from '../view';
import { Arg } from '../arg';

export const plot = () => new View('plot', {
  displayName: 'Plot Chart',
  description: 'Show your data, as plots',
  modelArgs: ['x', 'y', 'color', 'size'],
  args: [
    new Arg('defaultStyle', {
      displayName: 'Default style',
      argType: 'seriesStyle',
      defaultValue: 'seriesStyle(lines=1)',
    }),
    new Arg('seriesStyle', {
      displayName: 'Series style',
      argType: 'seriesStyle',
      defaultValue: 'seriesStyle(label="label", bars=1)',
      multi: true,
    }),
  ],
});
