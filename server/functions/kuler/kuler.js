import fetch from 'axios';
import { map } from 'lodash';

export const kuler = {
  name: 'kuler',
  aliases: [],
  type: 'palette',
  help: 'Get a color palette from Adobe\'s Kuler',
  context: {},
  args: {
    _: {
      types: ['string'],
      help: 'ID of palette to fetch, or "random"',
      default: 'random',
    },
    gradient: {
      types: ['boolean', 'null'],
      help: 'Prefer to make a gradient where supported and useful',
    },
  },
  fn: (context, args) => {
    // curl 'https://color.adobe.com/api/v2/themes?filter=public&startIndex=0&maxNumber=50&sort=like_count&time=week'
    // -H 'x-api-key: 7810788A1CFDC3A717C58F96BC4DD8B4' --compressed

    function getTheme(id) {
      const APIKEY = '7810788A1CFDC3A717C58F96BC4DD8B4';

      const path = id === 'random' ? '?filter=public&startIndex=0&maxNumber=36&sort=like_count&time=week' : `/${args._}?metadata=all`;
      return fetch(`https://color.adobe.com/api/v2/themes${path}`, {
        method: 'GET',
        responseType: 'json',
        headers: {
          'x-api-key': APIKEY,
        },
      })
      .then(reply => id === 'random' ? reply.data.themes[Math.floor(Math.random() * 36)] : reply);
    }

    return getTheme(args._).then(theme => {
      const colors = map(theme.swatches, color => `#${color.hex}`);
      return {
        type: 'palette',
        name: theme.name,
        gradient: args.gradient == null ? false : args.gradient,
        colors,
      };
    });
  },
};
