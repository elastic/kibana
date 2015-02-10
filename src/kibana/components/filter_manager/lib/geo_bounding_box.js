define(function (require) {
  var _ = require('lodash');
  return function buildGeoBoundingBox(box, index) {
    return {
      geo_bounding_box : box,
      meta: {
        index: index,
      }
    };
  };
});