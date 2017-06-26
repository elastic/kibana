import Fn from '../fn.js';
import fetch from 'axios';
import elasticLogo from './elastic_logo';
import { encode, imageTypes } from '../../lib/dataurl';

module.exports = new Fn({
  name: 'image',
  aliases: [],
  type: 'dataurl',
  help: 'Render an image',
  context: {},
  args: {
    dataurl: {
      types: ['dataurl', 'null'],
      help: 'Base64 encoded image',
      aliases: ['_'],
      default: elasticLogo,
    },
    url: {
      types: ['string', 'null'],
      help: 'URL to an image',
    },
  },
  fn: (context, args) => {
    // return base64 data
    // TODO: validate data type
    if (args.url) {
      // fetch image from URL
      const fetchImage = (type = 'blob') => {
        return fetch(args.url, {
          method: 'GET',
          responseType: type,
        })
        .then((res) => {
          const type = res.headers['content-type'];

          if (imageTypes.indexOf(type) < 0) {
            return Promise.reject(new Error(`Invalid image type: ${type}`));
          }

          return { data: res.data, type };
        });
      };

      // use FileReader if it's available, like in the browser
      if (FileReader) {
        return fetchImage().then(({ data }) => encode(data));
      }

      // otherwise fall back to fromByteArray
      // note: Buffer doesn't seem to correctly base64 encode binary data
      return fetchImage('arraybuffer').then(({ data, type }) => encode(data, type));
    }

    return args.dataurl;
  },
});
