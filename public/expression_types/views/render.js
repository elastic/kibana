import { View } from '../view';
import { Arg } from '../arg';

// TODO: add the url input and handling
export const render = () => new View('render', {
  displayName: 'Render',
  description: 'Generic element properties',
  modelArgs: [],
  requiresContext: false,
  args: [
    new Arg('containerStyle', {
      displayName: 'Container Style',
      description: 'Tweak the appearance of the element container',
      argType: 'containerStyle',
      defaultValue: '{containerStyle}',
    }),
    new Arg('css', {
      displayName: 'Custom CSS',
      description: 'CSS will be scoped to your element',
      argType: 'textarea',
      options: {
        confirm: 'Apply Stylesheet',
      },
    }),
  ],
});
