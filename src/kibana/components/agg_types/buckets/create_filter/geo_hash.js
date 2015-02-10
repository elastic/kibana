define(function (require) {
  var buildGeoBoundingBox = require('components/filter_manager/lib/geo_bounding_box');
  var decodeGeoHash = require('utils/decode_geo_hash');

  return function createGeohashFilterProvider(Private) {
    return function (aggConfig, key) {
      return buildGeoBoundingBox(createBoundingBoxContent(aggConfig.params.field.name, key), aggConfig.vis.indexPattern.id);
    };
  };

    /**
   * createBoundingBoxContent returns the contents object to be added
   * to the ES search based on the feature that has been select through a click
   *
   * @method createBoundingBoxContent
   * @param geoHash {String}
   * @return {Object}
   */

  function createBoundingBoxContent(field, geoHash) {
    var location = decodeGeoHash(geoHash);
    var content = {};
    content[field] = {
      'top_left' : {
        'lat' : location.latitude[1],
        'lon' : location.longitude[0]
      },
      'bottom_right' : {
        'lat' : location.latitude[0],
        'lon' : location.longitude[1]
      }
    };
    return content;
  }
});
