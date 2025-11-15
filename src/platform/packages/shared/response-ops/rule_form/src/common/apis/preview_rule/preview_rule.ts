/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpSetup } from '@kbn/core/public';
import type { PreviewRuleBody } from './types';
// import type { Rule } from '../../types';
import { transformCreateRuleBody } from '../create_rule';
import { BASE_ALERTING_API_PATH } from '../../../constants';

// TODO: Fix type
export async function previewRule({
  http,
  rule,
}: {
  http: HttpSetup;
  rule: PreviewRuleBody;
}): Promise<any> {
  const res = await http.post<any>(`${BASE_ALERTING_API_PATH}/rule/_execute`, {
    body: JSON.stringify(transformCreateRuleBody(rule)),
  });
  return res;
}
