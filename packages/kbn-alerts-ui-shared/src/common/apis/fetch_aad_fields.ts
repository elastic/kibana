/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { HttpStart } from '@kbn/core/public';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { BASE_RAC_ALERTS_API_PATH, EMPTY_AAD_FIELDS } from '../constants';

export async function fetchAadFields({
  http,
  ruleTypeId,
}: {
  http: HttpStart;
  ruleTypeId?: string;
}): Promise<DataViewField[]> {
  if (!ruleTypeId) return EMPTY_AAD_FIELDS;
  const fields = await http.get<DataViewField[]>(`${BASE_RAC_ALERTS_API_PATH}/aad_fields`, {
    query: { ruleTypeId },
  });

  return fields;
}
