/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { NEVER, RefinementCtx, ZodIssueCode } from 'zod';

const TimeWindowUnits = new Set(['s', 'm', 'h', 'd']);

export const validateTimeWindowUnits = (
  timeWindowUnit: string, 
  zodRefinementCtx: RefinementCtx,
) => {
  if (TimeWindowUnits.has(timeWindowUnit)) {
    return;
  }
  
  zodRefinementCtx.addIssue({
    code: ZodIssueCode.custom,
    message: i18n.translate(
      'xpack.triggersActionsUI.data.coreQueryParams.invalidTimeWindowUnitsErrorMessage',
      {
        defaultMessage: 'invalid timeWindowUnit: "{timeWindowUnit}"',
        values: {
          timeWindowUnit,
        },
      }
    ),
    fatal: true,
  });

  return NEVER;
}
