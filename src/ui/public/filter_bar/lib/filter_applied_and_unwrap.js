import _ from 'lodash';
export default function (filters) {
  return _.filter(filters, 'meta.apply');
}

