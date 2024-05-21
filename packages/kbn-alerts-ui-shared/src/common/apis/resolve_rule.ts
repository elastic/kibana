/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpSetup } from '@kbn/core-http-browser';
import { AsApiContract } from '@kbn/actions-types';
import { Rule } from '@kbn/alerting-types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../constants';
import { transformRule } from '../utils';

export async function resolveRule({ http, id }: { http: HttpSetup; id: string }): Promise<Rule> {
  const res = await http.get<AsApiContract<Rule>>(
    `${INTERNAL_BASE_ALERTING_API_PATH}/rule/${encodeURIComponent(id)}/_resolve`
  );
  return transformRule(res);
}
