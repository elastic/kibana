/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Must match OTEL_RECEIVER_PORT in the test file (audit_log.spec.ts), which starts a
// fake OTLP/HTTP receiver on this port to capture the appender's exported log records.
export const OTEL_RECEIVER_PORT = 18923;

// Injected as an OTel resource attribute via OTEL_RESOURCE_ATTRIBUTES (see the config's
// kbnTestServer.env) to exercise `promoteResourceAttributes` — it stands in for the project.id an
// APM global label would provide in a real Serverless deployment. The specs assert it is promoted to
// per-record attributes (Serverless) and kept in the resource (traditional).
export const OTEL_TEST_PROJECT_ID = 'scout-otel-test-project';

// Puts OTEL_TEST_PROJECT_ID into the resource as `project.id` (the env detector preserves the dotted
// key). Applied via kbnTestServer.env in the config sets below.
export const securityAuditOtelServerEnv = {
  OTEL_RESOURCE_ATTRIBUTES: `project.id=${OTEL_TEST_PROJECT_ID}`,
};

export const securityAuditOtelServerArgs = [
  '--xpack.security.audit.enabled=true',
  '--xpack.security.audit.appender.type=otel',
  '--xpack.security.audit.appender.protocol=http',
  `--xpack.security.audit.appender.url=http://127.0.0.1:${OTEL_RECEIVER_PORT}/v1/logs`,
];
