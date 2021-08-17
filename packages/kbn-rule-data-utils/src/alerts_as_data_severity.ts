/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const ALERT_SEVERITY_WARNING = 'warning';
export const ALERT_SEVERITY_CRITICAL = 'critical';
export type AlertSeverity = typeof ALERT_SEVERITY_WARNING | typeof ALERT_SEVERITY_CRITICAL;
