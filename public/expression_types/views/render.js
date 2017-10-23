// TODO: add the url input and handling
export const render = () => ({
  name: 'render',
  displayName: 'Element Style',
  help: 'Setting for the container around your element',
  modelArgs: [],
  requiresContext: false,
  args: [{
    name: 'containerStyle',
    displayName: 'Container Style',
    help: 'Tweak the appearance of the element container',
    argType: 'containerStyle',
    default: '{containerStyle}',
  }, {
    name: 'css',
    displayName: 'Custom CSS',
    help: 'A CSS stylesheet scoped to your element',
    argType: 'textarea',
    default: `".canvas__element {

}"`,
    options: {
      confirm: 'Apply Stylesheet',
    },
  }],
});
