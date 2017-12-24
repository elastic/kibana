import { get } from 'lodash';
import { elasticLogo } from '../../../common/functions/image/elastic_logo.js';
import { isValid } from '../../../common/lib/dataurl';

export const repeatImage = () => ({
  name: 'repeatImage',
  displayName: 'Repeating Image',
  help: '',
  modelArgs: [['size', { label: 'Count' }]],
  args: [{
    name: 'image',
    displayName: 'Upload Image',
    argType: 'imageUpload',

    // TODO: This code is repeated in both image.js and this file. Shouldn't this be handled in the imageUpload argType?
    resolve({ args }) {
      const wrap = (val) => ({ dataurl: val });
      const dataurl = get(args, 'dataurl.0', null);

      if (dataurl && isValid(dataurl)) return wrap(dataurl);
      return wrap(elasticLogo);
    },
  }, {
    name: 'max',
    displayName: 'Max repeated images',
    argType: 'number',
    default: '1000',
  }],
});
