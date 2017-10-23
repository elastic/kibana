export const markdown = () => ({
  name: 'markdown',
  displayName: 'Markdown',
  description: 'Generate markup using markdown',
  modelArgs: [],
  requiresContext: false,
  args: [{
    name: '_',
    displayName: 'Markdown content',
    description: 'Markdown formatted text',
    argType: 'textarea',
    options: {
      confirm: 'Apply',
    },
    multi: true,
  }, {
    name: 'font',
    displayName: 'Text settings',
    description: 'Fonts, alignment and color',
    argType: 'font',
  }],
});
