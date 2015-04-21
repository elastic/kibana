define(function (require) {
  var _ = require('lodash');
  return function buildGeoBoundingBoxFilter(field, value, indexPattern) {
    var filter = { meta: { index: indexPattern.id} };

    if (field.scripted) {
      filter.script = {
        script: '(' + field.script + ') == value',
        lang: field.lang,
        params: {
          value: value
        }
      };
      filter.meta.field = field.name;
    } else {
      filter.geo_bounding_box = value;
    }
    return filter;
  };
});
