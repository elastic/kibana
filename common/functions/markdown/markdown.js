import { Handlebars } from '../../lib/handlebars.js';
import Fn from '../fn.js';

export default new Fn({
  name: 'markdown',
  aliases: [],
  type: 'render',
  help: 'Render markup from markdown',
  context: {
    types: ['datatable', 'null'],
  },
  args: {
    _: {
      types: ['string'],
      help: 'Markdown context',
      default: '',
      multi: true,
    },
  },
  fn: (context, args) => {
    const compileFunctions = args._.map(str => Handlebars.compile(String(str)));
    const ctx = Object.assign({
      columns: [],
      rows: [],
      type: null,
    }, context);

    return {
      type: 'render',
      as: 'markdown',
      value: {
        markup: compileFunctions.map(fn => fn(ctx)).join(''),
      },
    };
  },
});
