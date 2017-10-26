import { map } from 'lodash';
import { math as mathjs } from '../../lib/math.js';
import { pivotObjectArray } from '../../lib/pivot_object_array.js';

export const math = {
  name: 'math',
  type: 'number',
  help: 'Interpret a mathJS expression, with a number or datatable as context. Datatable columns are available by their column name. ' +
  'If you pass in a number it is available as "value" (without the quotes)',
  context: {
    types: ['number', 'datatable'],
  },
  args: {
    _: {
      types: ['string'],
    },
  },
  fn: (context, args) => {
    const isDatatable = context && context.type === 'datatable';
    const mathContext = isDatatable ? pivotObjectArray(context.rows, map(context.columns, 'name')) : { value: context };
    const result = mathjs.eval(args._, mathContext);
    if (typeof result !== 'number') throw new Error ('Failed to execute math expression. Check your column names');
    return result;
  },
};
