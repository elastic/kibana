/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpSetup } from '@kbn/core/public';
import { AsApiContract } from '@kbn/actions-plugin/common';
import { ResolvedRule } from '../../../types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../common/constants';
import { transformResolvedRule } from '../common_transformations';

export async function resolveRule({
  http,
  ruleId,
}: {
  http: HttpSetup;
  ruleId: string;
}): Promise<ResolvedRule> {
  const res = await http.get<AsApiContract<ResolvedRule>>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rule/${encodeURIComponent(ruleId)}/_resolve`
  );
  return transformResolvedRule(res);
}
