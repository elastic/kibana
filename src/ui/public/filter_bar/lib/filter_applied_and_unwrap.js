import _ from 'lodash';

export function filterAppliedAndUnwrap(filters) {
  return _.filter(filters, 'meta.apply');
}

