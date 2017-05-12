import Fn from '../fn.js';
import math from 'mathjs';
import { getMathjsScope } from './get_mathjs_scope';

module.exports = new Fn({
  name: 'math',
  type: 'number',
  help: 'Turn a datatable into a single number using a MathJS formula',
  context: {
    types: ['datatable'],
  },
  args: {
    _: {
      types: ['string'],
    },
  },
  fn: (context, args) => math.eval(args._, getMathjsScope(context)),
});
