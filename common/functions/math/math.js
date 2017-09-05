import Fn from '../fn.js';
import { math } from '../../lib/math.js';
import { getMathjsScope } from './get_mathjs_scope';

export default new Fn({
  name: 'math',
  type: 'number',
  help: 'Interpret a mathJS expression, with a datatable as context, or not',
  context: {
    types: ['null', 'datatable'],
  },
  args: {
    _: {
      types: ['string'],
    },
  },
  fn: (context, args) => {
    const mathContext = context && context.type === 'datatable' ? getMathjsScope(context) : null;
    const result = math.eval(args._, mathContext);
    if (typeof result !== 'number') throw new Error ('Failed to execute math expression. Check your column names');
    return result;
  },
});
