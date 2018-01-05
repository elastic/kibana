import _ from 'lodash';
import { SavedObjectNotFound } from '../../errors';

export function FilterBarLibMapGeoPolygonProvider(Promise, courier) {
  return function (filter) {
    if (filter.geo_polygon) {
      function getParams(indexPattern) {
        const type = 'geo_polygon';
        const key = _.keys(filter.geo_polygon)
          .filter(key => key !== 'ignore_unmapped')[0];
        const params = filter.geo_polygon[key];

        // Sometimes a filter will end up with an invalid index param. This could happen for a lot of reasons,
        // for example a user might manually edit the url or the index pattern's ID might change due to
        // external factors e.g. a reindex. We only need the index in order to grab the field formatter, so we fallback
        // on displaying the raw value if the index is invalid.
        const points = params.points.map((point) => {
          return indexPattern
            ? indexPattern.fields.byName[key].format.convert(point)
            : JSON.stringify(point);
        });
        const value = points.join(', ');
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
