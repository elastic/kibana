import _ from 'lodash';
export default function collectKeys(children, showCounts = false) {
  let nextChildren = _.pluck(children, 'children');
  let keys = _.pluck(children, 'name');
  return _(nextChildren)
  .map(collectKeys)
  .flattenDeep()
  .union(keys)
  .value();
};
