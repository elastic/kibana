var _ = require('lodash');
export default function (filters) {
  return _.filter(filters, 'meta.apply');
};

