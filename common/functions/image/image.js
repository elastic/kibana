import Fn from '../fn.js';
import fetch from 'axios';
import elasticLogo from './elastic_logo';
import { encode, imageTypes } from '../../lib/dataurl';

function wrapDataurlType(dataurl) {
  return {
    type: 'dataurl',
    dataurl,
  };
}

const fetchImage = (url) => {
  const responseType = (FileReader) ? 'blob' : 'arraybuffer';

  return fetch(url, {
    method: 'GET',
    responseType,
  })
  .then((res) => {
    const type = res.headers['content-type'];

    if (imageTypes.indexOf(type) < 0) {
      return Promise.reject(new Error(`Invalid image type: ${type}`));
    }

    return encode(res.data, type);
  });
};

module.exports = new Fn({
  name: 'image',
  aliases: [],
  type: 'dataurl',
  help: 'Render an image',
  context: {},
  args: {
    dataurl: {
      types: ['dataurl', 'string', 'null'],
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
    // return dataurl object
    // TODO: validate data type
    if (args.url) {
      return fetchImage(args.url).then(dataurl => wrapDataurlType(dataurl));
    }

    return wrapDataurlType(args.dataurl);
  },
});
