import Fn from '../../../common/functions/fn.js';
import { parse } from 'url';


export default new Fn({
  name: 'urlparam',
  aliases: [],
  type: 'string',
  help: 'Access URL hash parameters and use them in expressions',
  context: {},
  args: {
    _: {
      types: [
        'string',
      ],
      'aliases': ['var', 'variable'],
      help: 'The URL hash parameter to access',
      'multi': false,
    },
    default: {
      types: [
        'string',
      ],
      default: '""',
      help: 'Return this string if the url parameter is not defined',
    },
  },
  fn: (context, args) => {
    const query = parse(location.href, true).query;
    return query[args._] || args.default;
  },
});
