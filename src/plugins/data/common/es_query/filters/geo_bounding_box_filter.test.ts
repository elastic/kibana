/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getGeoBoundingBoxFilterField } from './geo_bounding_box_filter';

describe('geo_bounding_box filter', function () {
  describe('getGeoBoundingBoxFilterField', function () {
    it('should return the name of the field a geo_bounding_box query is targeting', () => {
      const filter = {
        geo_bounding_box: {
          geoPointField: {
            bottom_right: { lat: 1, lon: 1 },
            top_left: { lat: 1, lon: 1 },
          },
          ignore_unmapped: true,
        },
        meta: {
          disabled: false,
          negate: false,
          alias: null,
          params: {
            bottom_right: { lat: 1, lon: 1 },
            top_left: { lat: 1, lon: 1 },
          },
        },
      };
      const result = getGeoBoundingBoxFilterField(filter);
      expect(result).toBe('geoPointField');
    });
  });
});
