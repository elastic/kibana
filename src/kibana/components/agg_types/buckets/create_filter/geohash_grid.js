define(function (require) {
  var buildGeoBoundingBox = require('components/filter_manager/lib/geo_bounding_box');
  return function createTermsFilterProvider(Private) {
    return function (aggConfig, key) {
      return buildGeoBoundingBox(aggConfig.params.field, key, aggConfig.vis.indexPattern);
    };
  };
});
