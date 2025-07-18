/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LogLevelCoalescedValue } from './get_log_level_coalesed_value';

// Severity ranking: lower index => higher severity
// The order is based on RFC 5424 (“The Syslog Protocol”, section 6.2.1)
export const severityOrder: LogLevelCoalescedValue[] = [
  LogLevelCoalescedValue.emergency,
  LogLevelCoalescedValue.alert,
  LogLevelCoalescedValue.fatal,
  LogLevelCoalescedValue.critical,
  LogLevelCoalescedValue.error,
  LogLevelCoalescedValue.warning,
  LogLevelCoalescedValue.notice,
  LogLevelCoalescedValue.info,
  LogLevelCoalescedValue.debug,
  LogLevelCoalescedValue.trace,
];

export const logLevelSynonyms: Record<string, LogLevelCoalescedValue> = {
  emerg: LogLevelCoalescedValue.emergency,
  crit: LogLevelCoalescedValue.critical,
  err: LogLevelCoalescedValue.error,
  eror: LogLevelCoalescedValue.error,
  warn: LogLevelCoalescedValue.warning,
  information: LogLevelCoalescedValue.info,
  informational: LogLevelCoalescedValue.info,
  dbg: LogLevelCoalescedValue.debug,
  dbug: LogLevelCoalescedValue.debug,
  panic: LogLevelCoalescedValue.emergency,
};
