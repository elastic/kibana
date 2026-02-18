/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RuleResponse } from './rule_schemas.gen';

export function isCustomizedPrebuiltRule(rule: RuleResponse): boolean {
  return rule.rule_source?.type === 'external' && rule.rule_source.is_customized;
}

export function isNonCustomizedPrebuiltRule(rule: RuleResponse): boolean {
  return rule.rule_source?.type === 'external' && rule.rule_source.is_customized === false;
}
