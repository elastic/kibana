/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const ALERT_SEVERITY_INFO = 'info';
export const ALERT_SEVERITY_LOW = 'low';
export const ALERT_SEVERITY_MEDIUM = 'medium';
export const ALERT_SEVERITY_HIGH = 'high';
export const ALERT_SEVERITY_CRITICAL = 'critical';

// Retained for backward compatibility with existing producers
// (e.g. Observability APM anomaly rule writes 'warning' | 'minor' | 'major' | 'critical')
export const ALERT_SEVERITY_WARNING = 'warning';
export const ALERT_SEVERITY_MINOR = 'minor';
export const ALERT_SEVERITY_MAJOR = 'major';

export type AlertSeverity =
  | typeof ALERT_SEVERITY_INFO
  | typeof ALERT_SEVERITY_LOW
  | typeof ALERT_SEVERITY_MEDIUM
  | typeof ALERT_SEVERITY_HIGH
  | typeof ALERT_SEVERITY_CRITICAL
  | typeof ALERT_SEVERITY_WARNING
  | typeof ALERT_SEVERITY_MINOR
  | typeof ALERT_SEVERITY_MAJOR;

/**
 * Ordered list of severity values from highest to lowest, intended for UX
 * surfaces and for runtime validation in API schemas.
 */
export const ALERT_SEVERITY_VALUES = [
  ALERT_SEVERITY_CRITICAL,
  ALERT_SEVERITY_MAJOR,
  ALERT_SEVERITY_HIGH,
  ALERT_SEVERITY_MEDIUM,
  ALERT_SEVERITY_MINOR,
  ALERT_SEVERITY_LOW,
  ALERT_SEVERITY_WARNING,
  ALERT_SEVERITY_INFO,
] as const satisfies readonly AlertSeverity[];
