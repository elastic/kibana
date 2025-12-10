/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { FindRuleTemplatesResponseV1 } from '@kbn/alerting-plugin/common/routes/rule_template/apis/find';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../constants';

export interface FindRuleTemplatesParams {
  http: HttpStart;
  page: number;
  perPage: number;
  search?: string;
  defaultSearchOperator?: string;
  sortField?: string;
  sortOrder?: string;
  ruleTypeId?: string;
  tags?: string[];
}

export interface FindRuleTemplatesResponse {
  total: number;
  page: number;
  perPage: number;
  data: Array<{
    id: string;
    name: string;
    tags: string[];
    ruleTypeId: string;
  }>;
}

export const rewriteTemplatesBodyRes = (
  response: FindRuleTemplatesResponseV1
): FindRuleTemplatesResponse => ({
  page: response.page,
  perPage: response.per_page,
  total: response.total,
  data: response.data.map((template) => ({
    id: template.id,
    name: template.name,
    tags: template.tags,
    ruleTypeId: template.rule_type_id,
  })),
});

export async function findRuleTemplates({
  http,
  page,
  perPage,
  search,
  defaultSearchOperator,
  sortField,
  sortOrder,
  ruleTypeId,
  tags,
}: FindRuleTemplatesParams): Promise<FindRuleTemplatesResponse> {
  const res = await http.get<FindRuleTemplatesResponseV1>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rule_template/_find`,
    {
      query: {
        page,
        per_page: perPage,
        search,
        default_search_operator: defaultSearchOperator,
        sort_field: sortField,
        sort_order: sortOrder,
        rule_type_id: ruleTypeId,
        tags,
      },
    }
  );
  return rewriteTemplatesBodyRes(res);
}
