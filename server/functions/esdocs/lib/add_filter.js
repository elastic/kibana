/*
  boolArray is the array of bool filter clauses to push filters into. Usually this would be
  the value of must, should or must_not.
  filter is the abstracted canvas filter.
*/

import * as filters from './filters';

export function addFilter(boolArray, filter) {
  if (!filters[filter.type]) throw new Error (`Unknown filter type: ${filter.type}`);
  boolArray.push(filters[filter.type](filter));
}
