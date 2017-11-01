import { mergeType } from './merge_type';

/**
 *  Reducer that merges two values concatenating all values
 *  into a flattened array
 *  @param  {Any} [initial]
 *  @return {Function}
 */
export const concat = mergeType((a, b) => (
  [].concat(a || [], b || [])
));
