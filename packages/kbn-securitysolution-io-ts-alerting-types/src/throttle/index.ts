/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';

export const throttle = t.union([t.literal('no_actions'), t.literal('rule')]);
export type Throttle = t.TypeOf<typeof throttle>;

export const throttleForBulkActions = t.literal('rule');
export type ThrottleForBulkActions = t.TypeOf<typeof throttleForBulkActions>;

export const throttleOrNull = t.union([throttle, t.null]);
export type ThrottleOrNull = t.TypeOf<typeof throttleOrNull>;

export const throttleForBulkActionsOrNull = t.union([throttleForBulkActions, t.null]);
export type ThrottleForBulkActionsOrNull = t.TypeOf<typeof throttleForBulkActionsOrNull>;

export const throttleOrNullOrUndefined = t.union([throttle, t.null, t.undefined]);
export type ThrottleOrUndefinedOrNull = t.TypeOf<typeof throttleOrNullOrUndefined>;
