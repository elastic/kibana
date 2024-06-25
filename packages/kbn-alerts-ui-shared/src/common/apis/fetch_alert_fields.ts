/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ValidFeatureId } from '@kbn/rule-data-utils';
import { HttpSetup } from '@kbn/core/public';
import { FieldSpec } from '@kbn/data-views-plugin/common';
import { BASE_RAC_ALERTS_API_PATH } from '../constants';

export async function fetchAlertFields({
  http,
  featureIds,
}: {
  http: HttpSetup;
  featureIds: ValidFeatureId[];
}): Promise<FieldSpec[]> {
  const { fields: alertFields = [] } = await http.get<{ fields: FieldSpec[] }>(
    `${BASE_RAC_ALERTS_API_PATH}/browser_fields`,
    {
      query: { featureIds },
    }
  );
  return alertFields;
}
