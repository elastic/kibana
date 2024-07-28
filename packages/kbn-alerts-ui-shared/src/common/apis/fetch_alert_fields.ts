/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpSetup } from '@kbn/core/public';
import { FieldSpec } from '@kbn/data-views-plugin/common';
import { BASE_RAC_ALERTS_API_PATH } from '../constants';

export async function fetchAlertFields({
  http,
  ruleTypeIds,
}: {
  http: HttpSetup;
  ruleTypeIds: string[];
}): Promise<FieldSpec[]> {
  const { fields: alertFields = [] } = await http.get<{ fields: FieldSpec[] }>(
    `${BASE_RAC_ALERTS_API_PATH}/browser_fields`,
    {
      query: { ruleTypeIds },
    }
  );
  return alertFields;
}
