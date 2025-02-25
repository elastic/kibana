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

import { MAX_GROUPS } from '../common/constants';
import {
  validateAggType,
  validateGroupBy,
  validateKuery,
  validateTimeWindowUnits,
  getComparatorSchemaType,
  betweenComparators,
  validateComparator,
} from '../common/utils';

export type Params = TypeOf<typeof ParamsSchema>;

export const CoreQueryParamsSchemaProperties = {
  // name of the indices to search
  index: schema.oneOf([
    schema.string({ minLength: 1 }),
    schema.arrayOf(schema.string({ minLength: 1 }), { minSize: 1 }),
  ]),
  // field in index used for date/time
  timeField: schema.string({ minLength: 1 }),
  // aggregation type
  aggType: schema.string({ validate: validateAggType, defaultValue: 'count' }),
  // aggregation field
  aggField: schema.maybe(schema.string({ minLength: 1 })),
  // how to group
  groupBy: schema.string({ validate: validateGroupBy, defaultValue: 'all' }),
  // field to group on (for groupBy: top)
  termField: schema.maybe(schema.string({ minLength: 1 })),
  // filter field
  filterKuery: schema.maybe(schema.string({ validate: validateKuery })),
  // limit on number of groups returned
  termSize: schema.maybe(schema.number({ min: 1 })),
  // size of time window for date range aggregations
  timeWindowSize: schema.number({ min: 1 }),
  // units of time window for date range aggregations
  timeWindowUnit: schema.string({ validate: validateTimeWindowUnits }),
};

export const CoreQueryParamsSchema = schema.object(CoreQueryParamsSchemaProperties);
export type CoreQueryParams = TypeOf<typeof CoreQueryParamsSchema>;

export const ParamsSchema = schema.object(
  {
    ...CoreQueryParamsSchemaProperties,
    // the comparison function to use to determine if the threshold as been met
    thresholdComparator: getComparatorSchemaType(validateComparator),
    // the values to use as the threshold; `between` and `notBetween` require
    // two values, the others require one.
    threshold: schema.arrayOf(schema.number(), { minSize: 1, maxSize: 2 }),
  },
  { validate: validateParams }
);

// using direct type not allowed, circular reference, so body is typed to any
function validateParams(anyParams: unknown): string | undefined {
  // validate core query parts, return if it fails validation (returning string)
  const coreQueryValidated = validateCoreQueryBody(anyParams);
  if (coreQueryValidated) return coreQueryValidated;

  const { thresholdComparator, threshold }: Params = anyParams as Params;

  if (betweenComparators.has(thresholdComparator) && threshold.length === 1) {
    return i18n.translate(
      'xpack.responseOps.ruleParams.indexThreshold.invalidThreshold2ErrorMessage',
      {
        defaultMessage:
          '[threshold]: must have two elements for the "{thresholdComparator}" comparator',
        values: {
          thresholdComparator,
        },
      }
    );
  }
}

export function validateCoreQueryBody(anyParams: unknown): string | undefined {
  const { aggType, aggField, groupBy, termField, termSize }: CoreQueryParams =
    anyParams as CoreQueryParams;
  if (aggType !== 'count' && !aggField) {
    return i18n.translate(
      'xpack.responseOps.ruleParams.coreQueryParams.aggTypeRequiredErrorMessage',
      {
        defaultMessage: '[aggField]: must have a value when [aggType] is "{aggType}"',
        values: {
          aggType,
        },
      }
    );
  }

  // check grouping
  if (groupBy === 'top') {
    if (termField == null) {
      return i18n.translate(
        'xpack.responseOps.ruleParams.coreQueryParams.termFieldRequiredErrorMessage',
        {
          defaultMessage: '[termField]: termField required when [groupBy] is top',
        }
      );
    }
    if (termSize == null) {
      return i18n.translate(
        'xpack.responseOps.ruleParams.coreQueryParams.termSizeRequiredErrorMessage',
        {
          defaultMessage: '[termSize]: termSize required when [groupBy] is top',
        }
      );
    }
    if (termSize > MAX_GROUPS) {
      return i18n.translate(
        'xpack.responseOps.ruleParams.coreQueryParams.invalidTermSizeMaximumErrorMessage',
        {
          defaultMessage: '[termSize]: must be less than or equal to {maxGroups}',
          values: {
            maxGroups: MAX_GROUPS,
          },
        }
      );
    }
  }
}
