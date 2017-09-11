import Markdown from 'markdown-it';
import { Handlebars } from '../../lib/handlebars.js';
import Fn from '../fn.js';

const md = new Markdown();

export default new Fn({
  name: 'markdown',
  aliases: [],
  type: 'string',
  help: 'Render markup from markdown',
  context: {
    types: ['datatable', 'null'],
  },
  args: {
    _: {
      types: ['string'],
      help: 'Markdown context',
      default: '',
    },
  },
  fn: (context, args) => {
    const render = Handlebars.compile(args._);
    const ctx = Object.assign({
      columns: [],
      rows: [],
      type: null,
    }, context);

    return {
      type: 'string',
      markup: md.render(render(ctx)),
    };
  },
});
