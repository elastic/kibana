define(function (require) {
  var _ = require('lodash');
  return function mapGeoBoundingBoxProvider(Promise, courier) {
    return function (filter) {
      var key, value, field;
      if (filter.geo_bounding_box) {
        return courier
        .indexPatterns
        .get(filter.meta.index).then(function (indexPattern) {
            key = _.keys(filter.geo_bounding_box)[0];
            field = indexPattern.fields.byName[key];
            value =  JSON.stringify(filter.geo_bounding_box);
            return { key: key, value: value };
          });
      }
      return Promise.reject(filter);
    };
  };
});
