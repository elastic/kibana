/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const ALERT_STATUS_ACTIVE = 'active';
export const ALERT_STATUS_RECOVERED = 'recovered';

export type AlertStatus = typeof ALERT_STATUS_ACTIVE | typeof ALERT_STATUS_RECOVERED;
