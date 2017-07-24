import _ from 'lodash';

export function FilterBarLibMapGeoPolygonProvider(Promise, courier) {
  return function (filter) {
    if (filter.geo_polygon) {
      return courier
      .indexPatterns
      .get(filter.meta.index).then(function (indexPattern) {
        const type = 'geo_polygon';
        const key = _.keys(filter.geo_polygon)
        .filter(key => key !== 'ignore_unmapped')[0];
        const field = indexPattern.fields.byName[key];
        const params = filter.geo_polygon[key];
        const points = params.points.map((point) => field.format.convert(point));
        const value = points.join(', ');
        return { type, key, value, params };
      });
    }
    return Promise.reject(filter);
  };
}
