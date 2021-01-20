/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getGeoPolygonFilterField } from './geo_polygon_filter';

describe('geo_polygon filter', function () {
  describe('getGeoPolygonFilterField', function () {
    it('should return the name of the field a geo_polygon query is targeting', () => {
      const filter = {
        geo_polygon: {
          geoPointField: {
            points: [{ lat: 1, lon: 1 }],
          },
          ignore_unmapped: true,
        },
        meta: {
          disabled: false,
          negate: false,
          alias: null,
          params: {
            points: [{ lat: 1, lon: 1 }],
          },
        },
      };
      const result = getGeoPolygonFilterField(filter);
      expect(result).toBe('geoPointField');
    });
  });
});
