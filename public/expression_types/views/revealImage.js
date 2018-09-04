export const revealImage = () => ({
  name: 'revealImage',
  displayName: 'Reveal Image',
  help: '',
  modelArgs: [['_', { label: 'Value' }]],
  args: [
    {
      name: 'image',
      displayName: 'Image',
      help: 'An image to reveal given the function input. Eg, a full glass',
      argType: 'imageUpload',
    },
    {
      name: 'emptyImage',
      displayName: 'Background Image',
      help: 'A background image. Eg, an empty glass',
      argType: 'imageUpload',
    },
    {
      name: 'origin',
      displayName: 'Reveal from',
      help: 'The direction from which to start the reveal',
      argType: 'select',
      options: {
        choices: [
          { value: 'top', name: 'Top' },
          { value: 'left', name: 'Left' },
          { value: 'bottom', name: 'Bottom' },
          { value: 'right', name: 'Right' },
        ],
      },
    },
  ],
});
