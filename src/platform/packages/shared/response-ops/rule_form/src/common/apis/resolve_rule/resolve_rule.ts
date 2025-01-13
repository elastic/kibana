/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HttpSetup } from '@kbn/core-http-browser';
import { AsApiContract } from '@kbn/actions-types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../../constants';
import { transformResolvedRule } from '../../transformations';
import { ResolvedRule } from '../../types';

export async function resolveRule({
  http,
  id,
}: {
  http: HttpSetup;
  id: string;
}): Promise<ResolvedRule> {
  const res = await http.get<AsApiContract<ResolvedRule>>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rule/${encodeURIComponent(id)}/_resolve`
  );
  return transformResolvedRule(res);
}
