/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AS_CODE_DATA_VIEW_SPEC_TYPE } from '@kbn/as-code-data-views-schema';

import { validator } from '../utils/validator';
import type { TagcloudConfig } from '../../schema';
import { DEFAULT_CATEGORICAL_COLOR_MAPPING } from '../../schema/color';
import { LensConfigBuilder } from '../../config_builder';
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
      validator.tag_cloud.fromState(tagcloudAttributes);
    });
    it('should convert a tag cloud with full config', () => {
      validator.tag_cloud.fromState(tagcloudAttributesWithFullConfig);
    });
    it('should convert an esql tagcloud', () => {
      validator.tag_cloud.fromState(tagcloudESQLAttributes);
    });
  });

  describe('api transform validation', () => {
    it('should convert a basic tagcloud chart with ad hoc dataView', () => {
      validator.tag_cloud.fromApi(basicTagcloudWithAdHocDataView);
    });

    it('should convert a basic tagcloud chart with dataView', () => {
      validator.tag_cloud.fromApi(basicTagcloudWithDataView);
    });

    it('should convert a ESQL-based tagcloud chart', () => {
      validator.tag_cloud.fromApi(basicEsqlTagcloud);
    });

    it('should convert a comprehensive tagcloud chart with ad hoc data view', () => {
      validator.tag_cloud.fromApi(comprehensiveTagcloudWithAdHocDataView);
    });

    it('should convert a comprehensive tagcloud chart with data view', () => {
      validator.tag_cloud.fromApi(comprehensiveTagcloudWithDataView);
    });

    it('should convert a comprehensive ESQL-based tagcloud chart', () => {
      validator.tag_cloud.fromApi(comprehensiveEsqlTagcloud);
    });
  });

  describe('color default application', () => {
    it('should emit DEFAULT_CATEGORICAL_COLOR_MAPPING on tag_by when no color is specified', () => {
      const config = {
        type: 'tag_cloud',
        title: 'Tagcloud color default test',
        data_source: {
          type: AS_CODE_DATA_VIEW_SPEC_TYPE,
          index_pattern: 'test-index',
          time_field: '@timestamp',
        },
        metric: {
          operation: 'count',
          empty_as_null: false,
        },
        tag_by: {
          operation: 'terms',
          fields: ['tags.keyword'],
          limit: 5,
        },
        sampling: 1,
        ignore_global_filters: false,
      } satisfies TagcloudConfig;

      const builder = new LensConfigBuilder();
      const lensState = builder.fromAPIFormat(config);
      const apiOutput = builder.toAPIFormat(lensState) as TagcloudConfig;

      expect(apiOutput.tag_by.color).toEqual(DEFAULT_CATEGORICAL_COLOR_MAPPING);
    });
  });
});
