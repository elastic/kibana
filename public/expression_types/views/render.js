import { View } from '../view';
import { Arg } from '../arg';

export const render = () => new View('render', {
  displayName: 'Render',
  description: 'Generic element properties',
  modelArgs: [],
  requiresContext: false,
  args: [
    new Arg('css', {
      displayName: 'Custom CSS',
      description: 'CSS will be scoped to your element',
      argType: 'textarea',
      options: {
        confirm: 'Apply Stylesheet',
      },
    }),
    // TODO: add the url input and handling
    // new Arg('url', {
    //   displayName: 'Image URL',
    //   argType: 'url',
    // }),
  ],
});
