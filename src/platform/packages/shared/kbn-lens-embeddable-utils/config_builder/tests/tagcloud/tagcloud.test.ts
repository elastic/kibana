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
  basicTagcloudWithAdHocDataView,
  basicTagcloudWithDataView,
  basicEsqlTagcloud,
  comprehensiveTagcloudWithAdHocDataView,
  comprehensiveTagcloudWithDataView,
  comprehensiveEsqlTagcloud,
} from './lens_api_config.mock';
import {
  tagcloudAttributes,
  tagcloudAttributesWithFullConfig,
  tagcloudESQLAttributes,
} from './lens_state_config.mock';

describe('Tagcloud', () => {
  describe('state transform validation', () => {
    it('should convert a simple tag cloud', () => {
      validator.tagcloud.fromState(tagcloudAttributes);
    });
    it('should convert a tag cloud with full config', () => {
      validator.tagcloud.fromState(tagcloudAttributesWithFullConfig);
    });
    it('should convert an esql tagcloud', () => {
      validator.tagcloud.fromState(tagcloudESQLAttributes);
    });
  });

  describe('api transform validation', () => {
    it('should convert a basic tagcloud chart with ad hoc dataView', () => {
      validator.tagcloud.fromApi(basicTagcloudWithAdHocDataView);
    });

    it('should convert a basic tagcloud chart with dataView', () => {
      validator.tagcloud.fromApi(basicTagcloudWithDataView);
    });

    it('should convert a ESQL-based tagcloud chart', () => {
      validator.tagcloud.fromApi(basicEsqlTagcloud);
    });

    it('should convert a comprehensive tagcloud chart with ad hoc data view', () => {
      validator.tagcloud.fromApi(comprehensiveTagcloudWithAdHocDataView);
    });

    it('should convert a comprehensive tagcloud chart with data view', () => {
      validator.tagcloud.fromApi(comprehensiveTagcloudWithDataView);
    });

    it('should convert a comprehensive ESQL-based tagcloud chart', () => {
      validator.tagcloud.fromApi(comprehensiveEsqlTagcloud);
    });
  });
});
