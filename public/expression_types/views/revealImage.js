import { elasticOutline } from '../../../common/functions/revealImage/elastic_outline';
import { resolveFromArgs } from '../../../common/lib/resolve_dataurl';

export const revealImage = () => ({
  name: 'revealImage',
  displayName: 'Reveal Image',
  help: '',
  modelArgs: [['size', { label: 'Percentage (Between 0 & 1)' }]],
  args: [
    {
      name: 'image',
      displayName: 'Image',
      help: 'An image to reveal given the function input. Eg, a full glass',
      argType: 'imageUpload',

      // TODO: This code is repeated in both image.js and this file. Shouldn't this be handled in the imageUpload argType?
      resolve({ args }) {
        return { dataurl: resolveFromArgs(args, elasticOutline) };
      },
    },
    {
      name: 'emptyImage',
      displayName: 'Background Image',
      help: 'A background image. Eg, an empty glass',
      argType: 'imageUpload',

      // TODO: This code is repeated in both image.js and this file. Shouldn't this be handled in the imageUpload argType?
      resolve({ args }) {
        return { dataurl: resolveFromArgs(args, elasticOutline) };
      },
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
