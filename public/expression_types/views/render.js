import { View } from '../view';
import { Arg } from '../arg';

// TODO: add the url input and handling
export const render = () => new View('render', {
  displayName: 'Element Style',
  description: 'Setting for the container around your element',
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
      description: 'A CSS stylesheet scoped to your element',
      argType: 'textarea',
      defaultValue: `".canvas__element {

}"`,
      options: {
        confirm: 'Apply Stylesheet',
      },
    }),
  ],
});
