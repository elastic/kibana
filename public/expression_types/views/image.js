import React from 'react';
import { get } from 'lodash';
import { View } from '../view';
import { Arg } from '../arg';
import elasticLogo from '../../../common/functions/image/elastic_logo.js';
import { isValid } from '../../../common/lib/dataurl';

export const image = () => new View('image', {
  displayName: 'Image',
  description: 'Display an image',
  modelArgs: [],
  args: [
    new Arg('dataurl', {
      displayName: 'Image Dataurl',
      argType: 'imageUpload',
      resolve({ args }) {
        const wrap = (val) => ({ dataurl: val });
        const dataurl = get(args, 'dataurl.0.value', null);

        if (dataurl && isValid(dataurl)) return wrap(dataurl);
        return wrap(elasticLogo);
      },
    }),
    // TODO: add the url input and handling
    // new Arg('url', {
    //   displayName: 'Image URL',
    //   argType: 'url',
    // }),
  ],
  template() {
    return (<div>Render image on the page</div>);
  },
});
