/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const AUDIT_LOG_PATH = '/tmp/kibana-scout-security-audit.log';

export const securityAuditServerArgs = [
  '--xpack.security.audit.enabled=true',
  '--xpack.security.audit.appender.type=file',
  `--xpack.security.audit.appender.fileName=${AUDIT_LOG_PATH}`,
  '--xpack.security.audit.appender.layout.type=json',
];
