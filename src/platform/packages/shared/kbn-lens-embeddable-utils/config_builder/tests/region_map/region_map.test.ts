/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { validator } from '../utils/validator';
import {
  basicRegionMapWithAdHocDataView,
  basicRegionMapWithDataView,
  basicEsqlRegionMap,
  comprehensiveRegionMapWithAdHocDataView,
  comprehensiveRegionMapWithDataView,
  comprehensiveEsqlRegionMap,
} from './lens_api_config.mock';
import {
  regionMapAttributes,
  regionMapAttributesWithEms,
  regionMapAttributesWithFilterForRegion,
  regionMapESQLAttributes,
  regionmapESQLAttributesWithEms,
} from './lens_state_config.mock';

describe('Region Map', () => {
  describe('state transform validation', () => {
    it('should convert a simple region map', () => {
      validator.region_map.fromState(regionMapAttributes);
    });
    it('should convert a region map with full config', () => {
      validator.region_map.fromState(regionMapAttributesWithEms);
    });
    it('should convert a region map with filters for region', () => {
      validator.region_map.fromState(regionMapAttributesWithFilterForRegion);
    });
    it('should convert an esql region map', () => {
      validator.region_map.fromState(regionMapESQLAttributes);
    });
    it('should convert an esql region map with full config', () => {
      validator.region_map.fromState(regionmapESQLAttributesWithEms);
    });
  });

  describe('api transform validation', () => {
    it('should convert a basic regionMap chart with ad hoc dataView', () => {
      validator.region_map.fromApi(basicRegionMapWithAdHocDataView);
    });

    it('should convert a basic regionMap chart with dataView', () => {
      validator.region_map.fromApi(basicRegionMapWithDataView);
    });

    it('should convert a ESQL-based regionMap chart', () => {
      validator.region_map.fromApi(basicEsqlRegionMap);
    });

    it('should convert a comprehensive regionMap chart with ad hoc data view', () => {
      validator.region_map.fromApi(comprehensiveRegionMapWithAdHocDataView);
    });

    it('should convert a comprehensive regionMap chart with data view', () => {
      validator.region_map.fromApi(comprehensiveRegionMapWithDataView);
    });

    it('should convert a comprehensive ESQL-based regionMap chart', () => {
      validator.region_map.fromApi(comprehensiveEsqlRegionMap);
    });
  });
});
