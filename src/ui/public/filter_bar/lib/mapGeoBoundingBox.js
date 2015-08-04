define(function (require) {
  var _ = require('lodash');
  return function mapGeoBoundBoxProvider(Promise, courier) {
    return function (filter) {
      var key;
      var value;
      var topLeft;
      var bottomRight;
      var field;
      if (filter.geo_bounding_box) {
        return courier
        .indexPatterns
        .get(filter.meta.index).then(function (indexPattern) {
          key = _.keys(filter.geo_bounding_box)[0];
          field = indexPattern.fields.byName[key];
          topLeft = field.format.convert(filter.geo_bounding_box[field.name].top_left);
          bottomRight = field.format.convert(filter.geo_bounding_box[field.name].bottom_right);
          value = topLeft + ' to ' + bottomRight;
          return { key: key, value: value };
        });
      }
      return Promise.reject(filter);
    };
  };
});
