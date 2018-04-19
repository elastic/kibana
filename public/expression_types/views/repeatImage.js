import { get } from 'lodash';
import { elasticLogo } from '../../../common/functions/image/elastic_logo';
import { isValid } from '../../../common/lib/dataurl';

export const repeatImage = () => ({
  name: 'repeatImage',
  displayName: 'Repeating Image',
  help: '',
  modelArgs: [['size', { label: 'Count' }]],
  args: [
    {
      name: 'image',
      displayName: 'Image',
      help: 'An image to repeat',
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
      displayName: 'Empty Image',
      help: 'An image to fill up the difference between the value and the max count',
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
      name: 'size',
      displayName: 'Image size',
      help:
        'The size of the largest dimension of the image. Eg, if the image is tall but not wide, this is the height',
      argType: 'number',
      default: '100',
    },
    {
      name: 'max',
      displayName: 'Max count',
      help: 'The maximum number of repeated images',
      argType: 'number',
      default: '1000',
    },
  ],
});
