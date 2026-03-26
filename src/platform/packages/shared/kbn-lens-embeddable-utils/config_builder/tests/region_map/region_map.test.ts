/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { regionMapStateSchema } from '../../schema';
import { validateAPIConverter, validateConverter } from '../validate';
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
  describe('validateConverter', () => {
    it('should convert a simple region map', () => {
      validateConverter(regionMapAttributes, regionMapStateSchema);
    });
    it('should convert a region map with full config', () => {
      validateConverter(regionMapAttributesWithEms, regionMapStateSchema);
    });
    it('should convert a region map with filters for region', () => {
      validateConverter(regionMapAttributesWithFilterForRegion, regionMapStateSchema);
    });
    it('should convert an esql region map', () => {
      validateConverter(regionMapESQLAttributes, regionMapStateSchema);
    });
    it('should convert an esql region map with full config', () => {
      validateConverter(regionmapESQLAttributesWithEms, regionMapStateSchema);
    });
  });
  describe('validateAPIConverter', () => {
    it('should convert a basic regionMap chart with ad hoc dataView', () => {
      validateAPIConverter(basicRegionMapWithAdHocDataView, regionMapStateSchema);
    });

    it('should convert a basic regionMap chart with dataView', () => {
      validateAPIConverter(basicRegionMapWithDataView, regionMapStateSchema);
    });

    it('should convert a ESQL-based regionMap chart', () => {
      validateAPIConverter(basicEsqlRegionMap, regionMapStateSchema);
    });

    it('should convert a comprehensive regionMap chart with ad hoc data view', () => {
      validateAPIConverter(comprehensiveRegionMapWithAdHocDataView, regionMapStateSchema);
    });

    it('should convert a comprehensive regionMap chart with data view', () => {
      validateAPIConverter(comprehensiveRegionMapWithDataView, regionMapStateSchema);
    });

    it('should convert a comprehensive ESQL-based regionMap chart', () => {
      validateAPIConverter(comprehensiveEsqlRegionMap, regionMapStateSchema);
    });
  });
});
