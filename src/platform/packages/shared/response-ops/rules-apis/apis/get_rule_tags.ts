/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { AsApiContract, RewriteRequestCase } from '@kbn/actions-types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../constants';

export interface GetRuleTagsParams {
  // Params
  search?: string;
  ruleTypeIds?: string[];
  perPage?: number;
  page: number;

  // Services
  http: HttpStart;
}

export interface GetRuleTagsResponse {
  total: number;
  page: number;
  perPage: number;
  data: string[];
}

export const rewriteTagsBodyRes: RewriteRequestCase<GetRuleTagsResponse> = ({
  per_page: perPage,
  ...rest
}) => ({
  perPage,
  ...rest,
});

export async function getRuleTags({
  http,
  search,
  ruleTypeIds,
  perPage,
  page,
}: GetRuleTagsParams): Promise<GetRuleTagsResponse> {
  const res = await http.get<AsApiContract<GetRuleTagsResponse>>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rules/_tags`,
    {
      query: {
        search,
        per_page: perPage,
        page,
        rule_type_ids: ruleTypeIds,
      },
    }
  );
  return rewriteTagsBodyRes(res);
}
