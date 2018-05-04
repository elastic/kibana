import { includes } from 'lodash';
import { elasticLogo } from './elastic_logo';

export const image = () => ({
  name: 'image',
  aliases: [],
  type: 'image',
  help: 'Create a base64 encoded image',
  context: {
    types: ['null'],
  },
  args: {
    dataurl: {
      // This was accepting dataurl, but there was no facility in fn for checking type and handling a dataurl type.
      types: ['string', 'null'],
      help: 'Base64 encoded image',
      aliases: ['_'],
      default: elasticLogo,
    },
    mode: {
      types: ['string', 'null'],
      help:
        '"contain" will show the entire image, scaled to fit.' +
        '"cover" will fill the container with the image, cropping from the sides or bottom as needed.' +
        '"stretch" will resize the height and width of the image to 100% of the container',
      default: 'contain',
    },
  },
  fn: (context, args) => {
    if (!includes(['contain', 'cover', 'stretch'], args.mode))
      throw '"mode" must be "contain", "cover", or "stretch"';

    const mode = args.mode === 'stretch' ? '100% 100%' : args.mode;

    return {
      type: 'image',
      mode,
      dataurl: args.dataurl,
    };
  },
});
