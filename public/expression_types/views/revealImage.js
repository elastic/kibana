import { get } from 'lodash';
import { elasticLogo } from '../../../common/functions/image/elastic_logo.js';
import { isValid } from '../../../common/lib/dataurl';

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
        const wrap = val => ({ dataurl: val });
        const dataurl = get(args, 'dataurl.0', null);

        if (dataurl && isValid(dataurl)) return wrap(dataurl);
        return wrap(elasticLogo);
      },
    },
    {
      name: 'emptyImage',
      displayName: 'Background Image',
      help: 'A background image. Eg, an empty glass',
      argType: 'imageUpload',

      // TODO: This code is repeated in both image.js and this file. Shouldn't this be handled in the imageUpload argType?
      resolve({ args }) {
        const wrap = val => ({ dataurl: val });
        const dataurl = get(args, 'dataurl.0', null);

        if (dataurl && isValid(dataurl)) return wrap(dataurl);
        return wrap(elasticLogo);
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
