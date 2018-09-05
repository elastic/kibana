import { evaluate } from 'tinymath';
import { pivotObjectArray } from '../../../common/lib/pivot_object_array';

export const math = () => ({
  name: 'math',
  type: 'number',
  help:
    'Interpret a math expression, with a number or datatable as context. Datatable columns are available by their column name. ' +
    'If you pass in a number it is available as "value" (without the quotes)',
  context: {
    types: ['number', 'datatable'],
  },
  args: {
    _: {
      types: ['string'],
      help:
        'An evaluated TinyMath expression. (See [TinyMath Functions](http://canvas.elastic.co/reference/tinymath.html))',
    },
  },
  fn: (context, args) => {
    if (!args._ || args._.trim() === '') {
      throw new Error('Empty expression');
    }
    const isDatatable = context && context.type === 'datatable';
    const mathContext = isDatatable
      ? pivotObjectArray(context.rows, context.columns.map(col => col.name))
      : { value: context };
    try {
      const result = evaluate(args._, mathContext);
      if (Array.isArray(result)) {
        if (result.length === 1) return result[0];
        throw new Error(
          'Expressions must return a single number. Try wrapping your expression in mean() or sum()'
        );
      }
      if (isNaN(result))
        throw new Error('Failed to execute math expression. Check your column names');
      return result;
    } catch (e) {
      if (context.rows.length === 0) {
        throw new Error('Empty datatable');
      } else {
        throw e;
      }
    }
  },
});
