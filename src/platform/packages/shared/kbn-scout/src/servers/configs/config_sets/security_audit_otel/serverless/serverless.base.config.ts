/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { defaultConfig } from '../../default/serverless/serverless.base.config';

// Must match OTEL_RECEIVER_PORT in the test file (audit_log.spec.ts), which starts a
// fake OTLP/HTTP receiver on this port to capture the appender's exported log records.
const OTEL_RECEIVER_PORT = 18923;

const kbnServerArgs = [
  ...defaultConfig.kbnTestServer.serverArgs,
  '--xpack.security.audit.enabled=true',
  '--xpack.security.audit.appender.type=otel',
  '--xpack.security.audit.appender.protocol=http',
  `--xpack.security.audit.appender.url=http://127.0.0.1:${OTEL_RECEIVER_PORT}/v1/logs`,
];

export const securityAuditOtelServerlessConfig: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: kbnServerArgs,
  },
};
