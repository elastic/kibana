/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { regionMapStateSchema } from '../../schema';
import { validateConverter } from '../validate';
import {
  regionMapAttributes,
  regionMapAttributesWithEms,
  regionMapAttributesWithFilterForRegion,
  regionMapESQLAttributes,
  regionmapESQLAttributesWithEms,
} from './lens_state_config.mock';

describe('Tagcloud', () => {
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
    it('should convert an esql region map with ems', () => {
      validateConverter(regionmapESQLAttributesWithEms, regionMapStateSchema);
    });
  });
});
