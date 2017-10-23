import { includes } from 'lodash';
import elasticLogo from './elastic_logo';
import { fetchImage } from '../../lib/fetch_image';

export default {
  name: 'image',
  aliases: [],
  type: 'image',
  help: 'Create a base64 encoded image',
  context: {},
  args: {
    dataurl: {
      // This was accepting dataurl, but there was no facility in fn for checking type and handling a dataurl type.
      types: ['string', 'null'],
      help: 'Base64 encoded image',
      aliases: ['_'],
      default: `'${elasticLogo}'`,
    },
    url: {
      types: ['string', 'null'],
      help: 'URL to an image',
    },
    mode: {
      types: ['string', 'null'],
      help: `"contain" will show the entire image, scaled to fit.
"cover" will fill the container with the image, cropping from the sides or bottom as needed.`,
    },
  },
  fn: (context, args) => {
    function wrapImage(dataurl) {
      const mode = args.mode === 'stretch' ? '100% 100%' : args.mode;
      return {
        type: 'image',
        mode: mode,
        dataurl,
      };
    }

    if (!includes(['contain', 'cover', 'stretch'], args.mode)) throw '"mode" must be "contain", "cover", or "stretch"';
    // return image object
    // TODO: validate data type
    if (args.url) {
      return fetchImage(args.url).then(wrapImage);
    }

    return wrapImage(args.dataurl);
  },
};
