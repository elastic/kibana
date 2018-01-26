import { parse } from 'url';

export const urlparam = () => ({
  name: 'urlparam',
  aliases: [],
  type: 'string',
  help:
    'Access URL parameters and use them in expressions. Eg https://localhost:5601/app/canvas?myVar=20. This will always return a string',
  context: {
    types: ['null'],
  },
  args: {
    _: {
      types: ['string'],
      aliases: ['var', 'variable'],
      help: 'The URL hash parameter to access',
      multi: false,
    },
    default: {
      types: ['string'],
      default: '""',
      help: 'Return this string if the url parameter is not defined',
    },
  },
  fn: (context, args) => {
    const query = parse(window.location.href, true).query;
    return query[args._] || args.default;
  },
});
