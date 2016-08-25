import _ from 'lodash';
export default function extractTimeFilterProvider(courier, Promise) {
  return Promise.method(function (filters) {
    // Assume all the index patterns are the same since they will be added
    // from the same visualization.
    const id = _.get(filters, '[0].meta.index');
    if (id == null) return;

    return courier.indexPatterns.get(id).then(function (indexPattern) {
      const filter = _.find(filters, function (obj) {
        const key = _.keys(obj.range)[0];
        return key === indexPattern.timeFieldName;
      });
      if (filter && filter.range) {
        return filter;
      }
    });
  });
}
