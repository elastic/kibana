import Fn from '../fn.js';
import elasticLogo from './elastic_logo';
import { fetchImage } from '../../lib/fetch_image';

function wrapDataurlType(dataurl) {
  return {
    type: 'dataurl',
    dataurl,
  };
}

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
