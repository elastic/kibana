/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchRoleDescriptor } from '@kbn/scout';

export const COMMON_HEADERS = {
  'kbn-xsrf': 'scout',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '1',
};

export const PROXY_PATH = 'internal/es_proxy';
export const TEST_INDEX = 'es-proxy-test';
export const FORBIDDEN_INDEX = 'es-proxy-forbidden';

export const INDEX_SCOPED_ROLE: ElasticsearchRoleDescriptor = {
  cluster: [],
  indices: [{ names: [`${TEST_INDEX}*`], privileges: ['all'] }],
};
