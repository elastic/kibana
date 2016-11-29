import _ from 'lodash';
export default function collectKeys(children) {
  let nextChildren = _.pluck(children, 'children');
  let keys = _.pluck(children, 'name');
  return _(nextChildren)
  .map(collectKeys)
  .flattenDeep()
  .union(keys)
  .value();
};
