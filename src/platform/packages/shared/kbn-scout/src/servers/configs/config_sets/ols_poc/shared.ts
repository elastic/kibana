/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const OLS_POC_AUDIT_LOG_PATH = '/tmp/kibana-scout-ols-poc-audit.log';

/**
 * Enables platform object-level security and writes the audit log as JSON to a file that the
 * object-level security suites read.
 */
export const olsPocServerArgs = [
  '--xpack.security.accessControl.enabled=true',
  '--xpack.security.audit.enabled=true',
  '--xpack.security.audit.appender.type=file',
  `--xpack.security.audit.appender.fileName=${OLS_POC_AUDIT_LOG_PATH}`,
  '--xpack.security.audit.appender.layout.type=json',
];
