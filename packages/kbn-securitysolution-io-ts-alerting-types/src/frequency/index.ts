/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';

import { RuleActionThrottle } from '../throttle';

export type RuleActionSummary = t.TypeOf<typeof RuleActionSummary>;
export const RuleActionSummary = t.boolean;

export type RuleActionNotifyWhen = t.TypeOf<typeof RuleActionNotifyWhen>;
export const RuleActionNotifyWhen = t.union([
  t.literal('onActionGroupChange'),
  t.literal('onActiveAlert'),
  t.literal('onThrottleInterval'),
]);

export type RuleActionFrequency = t.TypeOf<typeof RuleActionFrequency>;
export const RuleActionFrequency = t.type({
  summary: RuleActionSummary,
  notifyWhen: RuleActionNotifyWhen,
  throttle: t.union([RuleActionThrottle, t.null]),
});
