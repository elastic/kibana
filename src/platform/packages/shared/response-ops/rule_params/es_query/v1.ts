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

import {
  validateTimeWindowUnits,
  validateAggType,
  validateGroupBy,
  getComparatorSchemaType,
  betweenComparators,
  validateComparator,
} from '../common/utils';

import {
  MAX_SELECTABLE_SOURCE_FIELDS,
  MAX_SELECTABLE_GROUP_BY_TERMS,
  ES_QUERY_MAX_HITS_PER_EXECUTION,
  MAX_GROUPS,
  Comparator,
} from '../common/constants';

const EsQueryRuleParamsSchemaProperties = {
  size: schema.number({
    min: 0,
    max: ES_QUERY_MAX_HITS_PER_EXECUTION,
    meta: {
      description:
        'The number of documents to pass to the configured actions when the threshold condition is met.',
    },
  }),
  timeWindowSize: schema.number({
    min: 1,
    meta: {
      description:
        'The size of the time window (in `timeWindowUnit` units), which determines how far back to search for documents. Generally it should be a value higher than the rule check interval to avoid gaps in detection.',
    },
  }),
  excludeHitsFromPreviousRun: schema.boolean({
    defaultValue: true,
    meta: {
      description:
        'Indicates whether to exclude matches from previous runs. If `true`, you can avoid alert duplication by excluding documents that have already been detected by the previous rule run. This option is not available when a grouping field is specified.',
    },
  }),
  timeWindowUnit: schema.string({
    validate: validateTimeWindowUnits,
    meta: {
      description:
        'The type of units for the time window. For example: seconds, minutes, hours, or days.',
    },
  }),
  threshold: schema.arrayOf(
    schema.number({
      meta: {
        description:
          'The threshold value that is used with the `thresholdComparator`. If the `thresholdComparator` is `between` or `notBetween`, you must specify the boundary values.',
      },
    }),
    { minSize: 1, maxSize: 2 }
  ),
  thresholdComparator: getComparatorSchemaType(validateComparator),
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
        'Indicates whether the aggregation is applied over all documents (`all`), grouped by row (`row`), or split into groups (`top`) using a grouping field (`termField`) where only the top groups (up to `termSize` number of groups) are checked. If grouping is used, an alert will be created for each group when it exceeds the threshold.',
    },
  }),
  termField: schema.maybe(
    schema.oneOf(
      [
        schema.string({ minLength: 1 }),
        schema.arrayOf(schema.string(), { minSize: 2, maxSize: MAX_SELECTABLE_GROUP_BY_TERMS }),
      ],
      {
        meta: {
          description:
            'The names of up to four fields that are used for grouping the aggregation. This property is required when `groupBy` is `top`.',
        },
      }
    )
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
  searchType: schema.oneOf(
    [schema.literal('searchSource'), schema.literal('esQuery'), schema.literal('esqlQuery')],
    {
      meta: {
        description:
          'The type of query For example: `esQuery` for Elasticsearch Query DSL or `esqlQuery` for Elasticsearch Query Language (ES|QL).',
      },
      defaultValue: 'esQuery',
    }
  ),
  timeField: schema.conditional(
    schema.siblingRef('searchType'),
    schema.literal('esQuery'),
    schema.string({ minLength: 1 }),
    schema.maybe(schema.string({ minLength: 1 })),
    { meta: { description: 'The field that is used to calculate the time window.' } }
  ),
  searchConfiguration: schema.conditional(
    schema.siblingRef('searchType'),
    schema.literal('searchSource'),
    schema.object({}, { unknowns: 'allow' }),
    schema.never(),
    {
      meta: {
        description:
          'The query definition, which uses KQL or Lucene to fetch the documents from Elasticsearch.',
      },
    }
  ),
  // esQuery rule params only
  esQuery: schema.conditional(
    schema.siblingRef('searchType'),
    schema.literal('esQuery'),
    schema.string({ minLength: 1 }),
    schema.never()
  ),
  index: schema.conditional(
    schema.siblingRef('searchType'),
    schema.literal('esQuery'),
    schema.arrayOf(schema.string({ minLength: 1 }), { minSize: 1 }),
    schema.never(),
    { meta: { description: 'The indices to query.' } }
  ),
  esqlQuery: schema.conditional(
    schema.siblingRef('searchType'),
    schema.literal('esqlQuery'),
    schema.object({ esql: schema.string({ minLength: 1 }) }),
    schema.never(),
    { meta: { description: 'The query definition in Elasticsearch Query Language.' } }
  ),
  sourceFields: schema.maybe(
    schema.arrayOf(
      schema.object({
        label: schema.string(),
        searchPath: schema.string(),
      }),
      {
        maxSize: MAX_SELECTABLE_SOURCE_FIELDS,
      }
    )
  ),
};

// rule type parameters
export type EsQueryRuleParams = TypeOf<typeof EsQueryRuleParamsSchema>;

function isSearchSourceRule(searchType: EsQueryRuleParams['searchType']) {
  return searchType === 'searchSource';
}

function isEsqlQueryRule(searchType: EsQueryRuleParams['searchType']) {
  return searchType === 'esqlQuery';
}

// using direct type not allowed, circular reference, so body is typed to any
export function validateParams(anyParams: unknown): string | undefined {
  const {
    esQuery,
    thresholdComparator,
    threshold,
    searchType,
    aggType,
    aggField,
    groupBy,
    termField,
    termSize,
  } = anyParams as EsQueryRuleParams;

  if (isEsqlQueryRule(searchType)) {
    const { timeField } = anyParams as EsQueryRuleParams;

    if (!timeField) {
      return i18n.translate('xpack.responseOps.ruleParams.esQuery.esqlTimeFieldErrorMessage', {
        defaultMessage: '[timeField]: is required',
      });
    }
    if (thresholdComparator !== Comparator.GT) {
      return i18n.translate(
        'xpack.responseOps.ruleParams.esQuery.esqlThresholdComparatorErrorMessage',
        {
          defaultMessage: '[thresholdComparator]: is required to be greater than',
        }
      );
    }
    if (threshold && threshold[0] !== 0) {
      return i18n.translate('xpack.responseOps.ruleParams.esQuery.esqlThresholdErrorMessage', {
        defaultMessage: '[threshold]: is required to be 0',
      });
    }

    // The esqlQuery type does not validate groupBy, as any groupBy other than 'row' is considered to be 'all'
    return;
  }

  if (betweenComparators.has(thresholdComparator) && threshold.length === 1) {
    return i18n.translate('responseOps.ruleParams.esQuery.invalidThreshold2ErrorMessage', {
      defaultMessage:
        '[threshold]: must have two elements for the "{thresholdComparator}" comparator',
      values: {
        thresholdComparator,
      },
    });
  }

  if (aggType !== 'count' && !aggField) {
    return i18n.translate('responseOps.ruleParams.esQuery.aggTypeRequiredErrorMessage', {
      defaultMessage: '[aggField]: must have a value when [aggType] is "{aggType}"',
      values: {
        aggType,
      },
    });
  }

  // check grouping
  if (groupBy === 'top') {
    if (termField == null) {
      return i18n.translate('xpack.responseOps.ruleParams.esQuery.termFieldRequiredErrorMessage', {
        defaultMessage: '[termField]: termField required when [groupBy] is top',
      });
    }
    if (termSize == null) {
      return i18n.translate('xpack.responseOps.ruleParams.esQuery.termSizeRequiredErrorMessage', {
        defaultMessage: '[termSize]: termSize required when [groupBy] is top',
      });
    }
    if (termSize > MAX_GROUPS) {
      return i18n.translate(
        'xpack.responseOps.ruleParams.esQuery.invalidTermSizeMaximumErrorMessage',
        {
          defaultMessage: '[termSize]: must be less than or equal to {maxGroups}',
          values: {
            maxGroups: MAX_GROUPS,
          },
        }
      );
    }
  }
  if (groupBy === 'row') {
    return i18n.translate('xpack.responseOps.ruleParams.esQuery.invalidRowGroupByErrorMessage', {
      defaultMessage: '[groupBy]: groupBy should be all or top when [searchType] is not esqlQuery',
    });
  }

  if (isSearchSourceRule(searchType)) {
    return;
  }

  try {
    const parsedQuery = JSON.parse(esQuery);

    if (parsedQuery && !parsedQuery.query) {
      return i18n.translate('xpack.responseOps.ruleParams.esQuery.missingEsQueryErrorMessage', {
        defaultMessage: '[esQuery]: must contain "query"',
      });
    }
  } catch (err) {
    return i18n.translate('xpack.responseOps.ruleParams.esQuery.invalidEsQueryErrorMessage', {
      defaultMessage: '[esQuery]: must be valid JSON',
    });
  }
}

export const EsQueryRuleParamsSchema = schema.object(EsQueryRuleParamsSchemaProperties, {
  validate: validateParams,
});
