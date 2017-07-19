import _ from 'lodash';

export function FilterBarLibMapGeoBoundingBoxProvider(Promise, courier) {
  return function (filter) {
    if (filter.geo_bounding_box) {
      return courier
      .indexPatterns
      .get(filter.meta.index).then(function (indexPattern) {
        const type = 'geo_bounding_box';
        const key = _.keys(filter.geo_bounding_box)
          .filter(key => key !== 'ignore_unmapped')[0];
        const field = indexPattern.fields.byName[key];
        const geoBoundingBox = filter.geo_bounding_box[key];
        const topLeft = field.format.convert(geoBoundingBox.top_left);
        const bottomRight = field.format.convert(geoBoundingBox.bottom_right);
        const value = topLeft + ' to ' + bottomRight;
        return { type, key, value };
      });
    }
    return Promise.reject(filter);
  };
}
