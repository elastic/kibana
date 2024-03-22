/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsQuery as kbnBuildEsQuery } from '@kbn/es-query';
import { NEVER, RefinementCtx, ZodIssueCode } from 'zod';
import { i18n } from '@kbn/i18n';

export const validateKQLStringFilter = (
  value: string,
  zodRefinementCtx: RefinementCtx,
) => {
  if (value === '') {
    // Allow clearing the filter.
    return;
  }

  try {
    kbnBuildEsQuery(undefined, [{ query: value, language: 'kuery' }], []);
  } catch (e) {
    zodRefinementCtx.addIssue({
      code: ZodIssueCode.custom,
      message: i18n.translate('xpack.observability.customThreshold.rule.schema.invalidFilterQuery', {
        defaultMessage: 'filterQuery must be a valid KQL filter',
      }),
      fatal: true,
    });
    return NEVER;
  }
};
