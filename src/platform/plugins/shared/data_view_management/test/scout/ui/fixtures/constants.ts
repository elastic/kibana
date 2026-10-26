/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const ES_ARCHIVE_LOGSTASH_FUNCTIONAL =
  'x-pack/platform/test/fixtures/es_archives/logstash_functional';

export const DATA_VIEWS_MANAGEMENT_PATH = '/app/management/kibana/dataViews';

export const FEATURE_CONTROLS_CUSTOM_SPACE = {
  id: 'dv_feature_controls_space',
  name: 'dv_feature_controls_space',
  disabledFeatures: [] as string[],
};

export const FEATURE_CONTROLS_CUSTOM_SPACE_DISABLED = {
  id: 'dv_feature_controls_space_disabled',
  name: 'dv_feature_controls_space_disabled',
  disabledFeatures: ['indexPatterns'],
};

export const SPACES_MANAGEMENT_CUSTOM_SPACE = {
  id: 'dv_mgmt_custom_space',
  name: 'dv_mgmt_custom_space',
  disabledFeatures: [] as string[],
};
