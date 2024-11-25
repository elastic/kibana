/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';

import { RuleActionThrottle } from '../throttle';

/**
 * Action summary indicates whether we will send a summary notification about all the generate alerts or notification per individual alert
 */
export type RuleActionSummary = t.TypeOf<typeof RuleActionSummary>;
export const RuleActionSummary = t.boolean;

/**
 * The condition for throttling the notification: `onActionGroupChange`, `onActiveAlert`,  or `onThrottleInterval`
 */
export type RuleActionNotifyWhen = t.TypeOf<typeof RuleActionNotifyWhen>;
export const RuleActionNotifyWhen = t.union([
  t.literal('onActionGroupChange'),
  t.literal('onActiveAlert'),
  t.literal('onThrottleInterval'),
]);

/**
 * The action frequency defines when the action runs (for example, only on rule execution or at specific time intervals).
 */
export type RuleActionFrequency = t.TypeOf<typeof RuleActionFrequency>;
export const RuleActionFrequency = t.type({
  summary: RuleActionSummary,
  notifyWhen: RuleActionNotifyWhen,
  throttle: t.union([RuleActionThrottle, t.null]),
});
