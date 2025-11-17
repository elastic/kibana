/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';

import { validateTimeWindowUnits } from '../common/utils';

const ESQLParamsSchemaProperties = {
  timeWindowSize: schema.number({
    min: 1,
  }),
  timeWindowUnit: schema.string({
    validate: validateTimeWindowUnits,
  }),
  timeField: schema.string({
    minLength: 1,
  }),
  esqlQuery: schema.object({ esql: schema.string({ minLength: 1 }) }),
  familyId: schema.string({ minLength: 1 }),
};

export type ESQLParams = TypeOf<typeof ESQLParamsSchema>;

export function validateParams(anyParams: unknown): string | undefined {
  const { timeField } = anyParams as ESQLParams;

  if (!timeField) {
    return i18n.translate('xpack.responseOps.ruleParams.esql.timeFieldErrorMessage', {
      defaultMessage: '[timeField]: is required',
    });
  }
}

export const ESQLParamsSchema = schema.object(ESQLParamsSchemaProperties, {
  validate: validateParams,
});
