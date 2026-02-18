/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { SortOrder } from '../../model';

export type PrebuiltRuleAssetsSortField = z.infer<typeof PrebuiltRuleAssetsSortField>;
export const PrebuiltRuleAssetsSortField = z.enum(['name', 'risk_score', 'severity']);

export type PrebuiltRuleAssetsSortItem = z.infer<typeof PrebuiltRuleAssetsSortItem>;
export const PrebuiltRuleAssetsSortItem = z.object({
  /**
   * Field to sort by
   */
  field: PrebuiltRuleAssetsSortField,
  /**
   * Sort order
   */
  order: SortOrder,
});

export type PrebuiltRuleAssetsSort = z.infer<typeof PrebuiltRuleAssetsSort>;
export const PrebuiltRuleAssetsSort = z.array(PrebuiltRuleAssetsSortItem);
