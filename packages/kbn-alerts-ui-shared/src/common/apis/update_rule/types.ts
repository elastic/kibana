/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Rule, RuleTypeParams } from '../../types';

export interface UpdateRuleBody<Params extends RuleTypeParams = RuleTypeParams> {
  name: Rule<Params>['name'];
  tags: Rule<Params>['tags'];
  schedule: Rule<Params>['schedule'];
  throttle?: Rule<Params>['throttle'];
  params: Rule<Params>['params'];
  actions: Rule<Params>['actions'];
  notifyWhen?: Rule<Params>['notifyWhen'];
  alertDelay?: Rule<Params>['alertDelay'];
}
