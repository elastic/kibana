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
  index: schema.oneOf(
    [
      schema.string({ minLength: 1 }),
      schema.arrayOf(schema.string({ minLength: 1 }), { minSize: 1 }),
    ],
    { meta: { description: 'The indices to query.' } }
  ),
  timeField: schema.string({
    minLength: 1,
    meta: { description: 'The field that is used to calculate the time window.' },
  }),
  aggType: schema.string({
    validate: validateAggType,
    defaultValue: 'count',
    meta: { description: 'The type of aggregation to perform.' },
  }),
  aggField: schema.maybe(
    schema.string({
      minLength: 1,
      meta: {
        description:
          'The name of the numeric field that is used in the aggregation. This property is required when `aggType` is `avg`, `max`, `min` or `sum`.',
      },
    })
  ),
  groupBy: schema.string({
    validate: validateGroupBy,
    defaultValue: 'all',
    meta: {
      description:
        'Indicates whether the aggregation is applied over all documents (`all`) or split into groups (`top`) using a grouping field (`termField`). If grouping is used, an alert will be created for each group when it exceeds the threshold; only the top groups (up to `termSize` number of groups) are checked.',
    },
  }),
  /**
   *
   *
   */
  termField: schema.maybe(
    schema.string({
      minLength: 1,
      meta: {
        description:
          'The names of up to four fields that are used for grouping the aggregation. This property is required when `groupBy` is `top`.',
      },
    })
  ),
  filterKuery: schema.maybe(
    schema.string({
      validate: validateKuery,
      meta: {
        description: 'A Kibana Query Language (KQL) expression thats limits the scope of alerts.',
      },
    })
  ),
  termSize: schema.maybe(
    schema.number({
      min: 1,
      meta: {
        description:
          'This property is required when `groupBy` is `top`. It specifies the number of groups to check against the threshold and therefore limits the number of alerts on high cardinality fields.',
      },
    })
  ),
  timeWindowSize: schema.number({
    min: 1,
    meta: {
      description:
        'The size of the time window (in `timeWindowUnit` units), which determines how far back to search for documents. Generally it should be a value higher than the rule check interval to avoid gaps in detection.',
    },
  }),
  timeWindowUnit: schema.string({
    validate: validateTimeWindowUnits,
    meta: {
      description:
        'The type of units for the time window. For example: seconds, minutes, hours, or days.',
    },
  }),
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
