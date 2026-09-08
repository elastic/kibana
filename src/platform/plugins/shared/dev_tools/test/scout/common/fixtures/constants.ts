/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const DEV_TOOLS_ALL_ROLE = {
  elasticsearch: { cluster: [] },
  kibana: [{ base: [], feature: { dev_tools: ['all'] }, spaces: ['*'] }],
};

export const DEV_TOOLS_READ_ROLE = {
  elasticsearch: { cluster: [] },
  kibana: [{ base: [], feature: { dev_tools: ['read'] }, spaces: ['*'] }],
};

export const NO_DEV_TOOLS_ROLE = {
  elasticsearch: { cluster: [] },
  kibana: [{ base: [], feature: { discover: ['all'] }, spaces: ['*'] }],
};

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
};

export const CAPABILITIES_API_PATH = '/api/core/capabilities';

export const CUSTOM_SPACE = {
  id: 'custom_space',
  name: 'custom_space',
  disabledFeatures: [],
};

export const CUSTOM_SPACE_DEV_TOOLS_DISABLED = {
  id: 'custom_space_dev_tools_disabled',
  name: 'custom_space_dev_tools_disabled',
  disabledFeatures: ['dev_tools'],
};

export const API_CUSTOM_SPACE = {
  id: 'api_custom_space',
  name: 'api_custom_space',
  disabledFeatures: [],
};

export const API_CUSTOM_SPACE_DEV_TOOLS_DISABLED = {
  id: 'api_custom_space_dev_tools_disabled',
  name: 'api_custom_space_dev_tools_disabled',
  disabledFeatures: ['dev_tools'],
};
