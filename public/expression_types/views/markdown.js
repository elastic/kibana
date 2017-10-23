export const markdown = () => ({
  name: 'markdown',
  displayName: 'Markdown',
  help: 'Generate markup using markdown',
  modelArgs: [],
  requiresContext: false,
  args: [{
    name: '_',
    displayName: 'Markdown content',
    help: 'Markdown formatted text',
    argType: 'textarea',
    options: {
      confirm: 'Apply',
    },
    multi: true,
  }, {
    name: 'font',
    displayName: 'Text settings',
    help: 'Fonts, alignment and color',
    argType: 'font',
  }],
});
