import { View } from '../view';
import { Arg } from '../arg';

export const table = () => new View('table', {
  displayName: 'Table',
  description: 'Set styling for a Table element',
  modelArgs: [],
  args: [
    new Arg('font', {
      displayName: 'Text settings',
      description: 'Fonts, alignment and color',
      argType: 'font',
    }),
  ],
});
