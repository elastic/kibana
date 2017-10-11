import { View } from '../view';
import { Arg } from '../arg';

export const timefilterControl = () => new View('timefilterControl', {
  displayName: 'Time Filter',
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
