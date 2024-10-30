/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEmpty } from 'lodash';
import type { EcsMetadata } from '@kbn/alerts-as-data-utils/src/field_maps/types';
import type { HttpStart } from '@kbn/core-http-browser';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { BASE_RAC_ALERTS_API_PATH, EMPTY_AAD_FIELDS } from '../../constants';

export const getDescription = (fieldName: string, ecsFlat: Record<string, EcsMetadata>) => {
  let ecsField = ecsFlat[fieldName];
  if (isEmpty(ecsField?.description ?? '') && fieldName.includes('kibana.alert.')) {
    ecsField = ecsFlat[fieldName.replace('kibana.alert.', '')];
  }
  return ecsField?.description ?? '';
};

export const fetchRuleTypeAadTemplateFields = async ({
  http,
  ruleTypeId,
}: {
  http: HttpStart;
  ruleTypeId?: string;
}): Promise<DataViewField[]> => {
  if (!ruleTypeId) return EMPTY_AAD_FIELDS;
  const fields = await http.get<DataViewField[]>(`${BASE_RAC_ALERTS_API_PATH}/aad_fields`, {
    query: { ruleTypeId },
  });

  return fields;
};
