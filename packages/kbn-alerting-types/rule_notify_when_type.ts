/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const RuleNotifyWhenTypeValues = [
  'onActionGroupChange',
  'onActiveAlert',
  'onThrottleInterval',
] as const;

export type RuleNotifyWhenType = (typeof RuleNotifyWhenTypeValues)[number];

export enum RuleNotifyWhen {
  CHANGE = 'onActionGroupChange',
  ACTIVE = 'onActiveAlert',
  THROTTLE = 'onThrottleInterval',
}
