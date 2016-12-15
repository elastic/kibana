import _ from 'lodash';
export default function collectKeys(children) {
  const nextChildren = _.pluck(children, 'children');
  const keys = _.pluck(children, 'name');
  return _(nextChildren)
  .map(collectKeys)
  .flattenDeep()
  .union(keys)
  .value();
}
