/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DISCOVER_SESSION_API_VERSION } from '../../../../common/constants';

export { DISCOVER_SESSION_API_BASE_PATH } from '../../../../common/constants';

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': DISCOVER_SESSION_API_VERSION,
} as const;

/** Existing Discover session archive used by Scout API tests */
export const KBN_ARCHIVES = {
  SESSION_WITH_CONTROL:
    'src/platform/test/functional/fixtures/kbn_archiver/discover/session_with_control.json',
} as const;

/** Discover session ID loaded by {@link KBN_ARCHIVES.SESSION_WITH_CONTROL} */
export const TEST_DISCOVER_SESSION_ID = 'c48fccf3-c6b1-412e-8a79-0ee36f836f98';
