/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { PrebuiltRulesFilter } from './prebuilt_rules_filter';

export enum RuleCustomizationStatus {
  CUSTOMIZED = 'CUSTOMIZED',
  NOT_CUSTOMIZED = 'NOT_CUSTOMIZED',
}

export type ReviewPrebuiltRuleUpgradeFilter = z.infer<typeof ReviewPrebuiltRuleUpgradeFilter>;
export const ReviewPrebuiltRuleUpgradeFilter = PrebuiltRulesFilter.merge(
  z.object({
    /**
     * Rule IDs to return upgrade info for
     */
    rule_ids: z.array(z.string()).optional(),
  })
);
