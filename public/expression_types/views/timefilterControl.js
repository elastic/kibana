import { View } from '../view';
import { Arg } from '../arg';

export const timefilterControl = () => new View('timefilterControl', {
  displayName: 'Time filter',
  description: 'Configure the timefilter element',
  modelArgs: [],
  args: [
    new Arg('column', {
      displayName: 'Column',
      description: 'Column to which selected time is applied',
      argType: 'string',
      options: {
        confirm: 'Set',
      },
    }),
  ],
});
