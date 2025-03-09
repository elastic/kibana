/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpSetup } from '@kbn/core/public';
import { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { Alert } from '@kbn/alerting-types';
import { CreateRuleBody } from '.';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../../constants';
import { transformPreviewRuleBody } from './transform_preview_rule_body';

export interface PreviewResults {
  uuid: string;
  alerts: Array<SearchHit<Alert>>;
  actions: any[];
}

export async function previewRule({
  http,
  rule,
}: {
  http: HttpSetup;
  rule: CreateRuleBody;
}): Promise<PreviewResults> {
  return await http.post<PreviewResults>(`${INTERNAL_BASE_ALERTING_API_PATH}/rules/_preview`, {
    body: JSON.stringify(transformPreviewRuleBody(rule)),
  });
}
