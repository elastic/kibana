import Hbars from 'handlebars/dist/handlebars';
import { math } from './math.js';
import { pivotObjectArray } from './pivot_object_array.js';

Hbars.registerHelper('math', (rows, expression, precision) => {
  if (!Array.isArray(rows)) return 'MATH ERROR: first argument must be an array';
  const value = math.eval(expression, pivotObjectArray(rows));
  return (precision) ? value.toFixed(precision) : value;
});

export const Handlebars = Hbars;
