/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tagcloudConfigSchema } from '../../schema';
import { validateAPIConverter, validateConverter } from '../validate';
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
  describe('validateConverter', () => {
    it('should convert a simple tag cloud', () => {
      validateConverter(tagcloudAttributes, tagcloudConfigSchema);
    });
    it('should convert a tag cloud with full config', () => {
      validateConverter(tagcloudAttributesWithFullConfig, tagcloudConfigSchema);
    });
    it('should convert an esql tagcloud', () => {
      validateConverter(tagcloudESQLAttributes, tagcloudConfigSchema);
    });
  });
  describe('validateAPIConverter', () => {
    it('should convert a basic tagcloud chart with ad hoc dataView', () => {
      validateAPIConverter(basicTagcloudWithAdHocDataView, tagcloudConfigSchema);
    });

    it('should convert a basic tagcloud chart with dataView', () => {
      validateAPIConverter(basicTagcloudWithDataView, tagcloudConfigSchema);
    });

    it('should convert a ESQL-based tagcloud chart', () => {
      validateAPIConverter(basicEsqlTagcloud, tagcloudConfigSchema);
    });

    it('should convert a comprehensive tagcloud chart with ad hoc data view', () => {
      validateAPIConverter(comprehensiveTagcloudWithAdHocDataView, tagcloudConfigSchema);
    });

    it('should convert a comprehensive tagcloud chart with data view', () => {
      validateAPIConverter(comprehensiveTagcloudWithDataView, tagcloudConfigSchema);
    });

    it('should convert a comprehensive ESQL-based tagcloud chart', () => {
      validateAPIConverter(comprehensiveEsqlTagcloud, tagcloudConfigSchema);
    });
  });
});
