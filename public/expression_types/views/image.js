import { get } from 'lodash';
import { View } from '../view';
import { Arg } from '../arg';
import elasticLogo from '../../../common/functions/image/elastic_logo.js';
import { isValid } from '../../../common/lib/dataurl';

export const image = () => new View('image', {
  displayName: 'Image',
  description: 'Display an image',
  modelArgs: [],
  requiresContext: false,
  args: [
    new Arg('dataurl', {
      displayName: 'Upload Image',
      argType: 'imageUpload',
      resolve({ args }) {
        const wrap = (val) => ({ dataurl: val });
        const dataurl = get(args, 'dataurl.0', null);

        if (dataurl && isValid(dataurl)) return wrap(dataurl);
        return wrap(elasticLogo);
      },
    }),
    new Arg('mode', {
      displayName: 'Fill mode',
      description: 'Note: Stretched fill may not work with vector images',
      argType: 'select',
      resolve() {
        return 'contain';
      },
      options: {
        choices: [
          { value: 'contain', name: 'Contain' },
          { value: 'cover', name: 'Cover' },
          { value: 'stretch', name: 'Stretch' },
        ],
      },
    }),
    // TODO: add the url input and handling
    // new Arg('url', {
    //   displayName: 'Image URL',
    //   argType: 'url',
    // }),
  ],
});
