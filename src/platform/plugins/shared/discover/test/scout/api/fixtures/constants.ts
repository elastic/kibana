/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DISCOVER_SESSION_API_VERSION } from '../../../../common/constants';

export {
  DISCOVER_SESSION_API_BASE_PATH,
  DISCOVER_SESSIONS_API_ENABLED_FEATURE_FLAG_KEY,
} from '../../../../common/constants';

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'elastic-api-version': DISCOVER_SESSION_API_VERSION,
} as const;
