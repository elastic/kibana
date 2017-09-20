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
    font: {
      types: ['style'],
      help: 'Font settings. Technically you can stick other styles in here too!',
      default: '{font}',
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
        content: compileFunctions.map(fn => fn(ctx)).join(''),
        font: args.font,
      },
    };
  },
});
