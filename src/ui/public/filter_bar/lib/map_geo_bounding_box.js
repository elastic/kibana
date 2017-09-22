import _ from 'lodash';
import { SavedObjectNotFound } from '../../errors';

export function FilterBarLibMapGeoBoundingBoxProvider(Promise, courier) {
  return function (filter) {
    if (filter.geo_bounding_box) {
      function getParams(indexPattern) {
        const type = 'geo_bounding_box';
        const key = _.keys(filter.geo_bounding_box)
          .filter(key => key !== 'ignore_unmapped')[0];
        const params = filter.geo_bounding_box[key];
        const topLeft = indexPattern
        ? indexPattern.fields.byName[key].format.convert(params.top_left)
        : JSON.stringify(params.top_left);
        const bottomRight = indexPattern
         ? indexPattern.fields.byName[key].format.convert(params.bottom_right)
         : JSON.stringify(params.bottom_right);
        const value = topLeft + ' to ' + bottomRight;
        return { type, key, value, params };
      }

      return courier
      .indexPatterns
      .get(filter.meta.index)
      .then(getParams)
      .catch((error) => {
        if (error instanceof SavedObjectNotFound) {
          return getParams();
        }
        throw error;
      });
    }
    return Promise.reject(filter);
  };
}
