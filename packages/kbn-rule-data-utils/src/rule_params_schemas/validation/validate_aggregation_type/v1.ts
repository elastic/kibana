/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { NEVER, RefinementCtx, ZodIssueCode } from 'zod';

const AggTypes = new Set(['count', 'avg', 'min', 'max', 'sum']);

export const validationAggregationType = (
  aggType: string,
  zodRefinementCtx: RefinementCtx,
) => {
  if (AggTypes.has(aggType)) {
    return;
  }

  zodRefinementCtx.addIssue({
    code: ZodIssueCode.custom,
    message: i18n.translate('xpack.triggersActionsUI.data.coreQueryParams.invalidAggTypeErrorMessage', {
      defaultMessage: 'invalid aggType: "{aggType}"',
      values: {
        aggType,
      },
    }),
    fatal: true,
  });

  return NEVER;
}
