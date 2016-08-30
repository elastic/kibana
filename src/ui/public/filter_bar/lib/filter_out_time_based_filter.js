import _ from 'lodash';
export default function filterOutTimeBaseFilter(courier, Promise) {
  return Promise.method(function (filters) {
    const id = _.get(filters, '[0].meta.index');
    if (id == null) return;

    return courier.indexPatterns.get(id).then(function (indexPattern) {
      return _.filter(filters, function (filter) {
        return !(filter.range && filter.range[indexPattern.timeFieldName]);
      });
    });
  });
};
