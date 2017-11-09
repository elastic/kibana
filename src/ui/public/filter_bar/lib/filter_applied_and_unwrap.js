import _ from 'ui/lodash';

export function filterAppliedAndUnwrap(filters) {
  return _.filter(filters, 'meta.apply');
}

