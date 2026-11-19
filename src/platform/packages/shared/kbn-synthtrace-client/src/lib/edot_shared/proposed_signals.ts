/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// The signal names proposed for EDOT Android and EDOT iOS. If the SDKs name them differently, this
// is the only place to change.

export const EVENT_SESSION_START = 'session.start';
export const EVENT_SESSION_END = 'session.end';
export const EVENT_APP_START = 'elastic.app.start';
export const EVENT_SCREEN_CLICK = 'app.screen.click';

export const SPAN_SCREEN_LOAD = 'elastic.screen.load';

export const ATTR_SESSION_PREVIOUS_ID = 'session.previous_id';
export const ATTR_START_TYPE = 'start.type';
export const ATTR_APP_START_DURATION = 'elastic.app.start.duration';
export const ATTR_SCREEN_NAME = 'app.screen.name';
export const ATTR_ERROR_KIND = 'elastic.error.kind';

export const START_TYPE_COLD = 'cold';
export const START_TYPE_WARM = 'warm';
export type AppStartType = typeof START_TYPE_COLD | typeof START_TYPE_WARM;

export const ERROR_KIND_ANR = 'anr';
export const ERROR_KIND_HANG = 'hang';
export type FreezeKind = typeof ERROR_KIND_ANR | typeof ERROR_KIND_HANG;
