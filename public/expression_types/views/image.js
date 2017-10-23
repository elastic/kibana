import { get } from 'lodash';
import elasticLogo from '../../../common/functions/image/elastic_logo.js';
import { isValid } from '../../../common/lib/dataurl';

export const image = () => ({
  name: 'image',
  displayName: 'Image',
  modelArgs: [],
  requiresContext: false,
  args: [{
    name: 'dataurl',
    displayName: 'Upload Image',
    argType: 'imageUpload',
    resolve({ args }) {
      const wrap = (val) => ({ dataurl: val });
      const dataurl = get(args, 'dataurl.0', null);

      if (dataurl && isValid(dataurl)) return wrap(dataurl);
      return wrap(elasticLogo);
    },
  }, {
    name: 'mode',
    displayName: 'Fill mode',
    help: 'Note: Stretched fill may not work with vector images',
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
  }],
  // TODO: add the url input and handling
  // {
  //   name: 'url',
  //   displayName: 'Image URL',
  //   argType: 'url',
  // },
});
