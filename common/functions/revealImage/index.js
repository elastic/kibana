import { elasticOutline } from './elastic_outline';

export const revealImage = () => ({
  name: 'revealImage',
  aliases: [],
  type: 'render',
  help: 'Configure a image reveal element',
  context: {
    types: ['number'],
  },
  args: {
    image: {
      types: ['string'],
      help: 'The image to reveal',
      default: elasticOutline,
    },
    emptyImage: {
      types: ['string', 'null'],
      help: 'An optional background image to reveal over',
    },
    origin: {
      types: ['string'],
      help: 'Where to start from. Eg, top, left, bottom or right',
      default: 'bottom',
    },
  },
  fn: (percent, args) => {
    if (percent > 1 || percent < 0) throw new Error('input must be between 0 and 1');

    return {
      type: 'render',
      as: 'revealImage',
      value: {
        percent,
        ...args,
      },
    };
  },
});
