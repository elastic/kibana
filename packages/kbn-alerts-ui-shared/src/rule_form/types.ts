/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Rule, RuleTypeParams } from '../common';

export interface RuleFormData<Params extends RuleTypeParams = RuleTypeParams> {
  name: Rule<Params>['name'];
  tags: Rule<Params>['tags'];
  params: Rule<Params>['params'];
  schedule: Rule<Params>['schedule'];
  consumer: Rule<Params>['consumer'];
  alertDelay?: Rule<Params>['alertDelay'];
  notifyWhen?: Rule<Params>['notifyWhen'];
  ruleTypeId?: Rule<Params>['ruleTypeId'];
}

export type InitialRule = Partial<Rule> &
  Pick<Rule, 'params' | 'consumer' | 'schedule' | 'actions' | 'tags'>;
