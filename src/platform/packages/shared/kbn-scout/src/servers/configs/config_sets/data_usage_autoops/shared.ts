/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';

// The tests start a mock AutoOps server on this port
export const dataUsageServerArgs = [
  '--xpack.dataUsage.autoops.enabled=true',
  '--xpack.dataUsage.autoops.api.url=http://localhost:9000',
  `--xpack.dataUsage.autoops.api.tls.certificate=${KBN_CERT_PATH}`,
  `--xpack.dataUsage.autoops.api.tls.key=${KBN_KEY_PATH}`,
];
