/**
 * Convert a value to a presentable string
 * @param  {any} val - the value to transform
 * @return {string}
 */
export function asPrettyString(val) {
  if (val === null || val === undefined) return ' - ';
  switch (typeof val) {
    case 'string': return val;
    case 'object': return JSON.stringify(val, null, '  ');
    default: return '' + val;
  }
}
