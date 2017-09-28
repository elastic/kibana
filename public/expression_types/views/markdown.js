import { View } from '../view';
import { Arg } from '../arg';

export const markdown = () => new View('markdown', {
  displayName: 'Markdown',
  description: 'Generate markup using markdown',
  modelArgs: [],
  requiresContext: false,
  args: [
    new Arg('_', {
      displayName: 'Markdown content',
      description: 'Markdown formatted text',
      argType: 'textarea',
      options: {
        confirm: 'Apply',
      },
      multi: true,
    }),
    new Arg('font', {
      displayName: 'Text settings',
      description: 'Fonts, alignment and color',
      argType: 'font',
    }),
  ],
});
