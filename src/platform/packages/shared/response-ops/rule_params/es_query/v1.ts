/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { schema, TypeOf } from '@kbn/config-schema';
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
  size: schema.number({ min: 0, max: ES_QUERY_MAX_HITS_PER_EXECUTION }),
  timeWindowSize: schema.number({ min: 1 }),
  excludeHitsFromPreviousRun: schema.boolean({ defaultValue: true }),
  timeWindowUnit: schema.string({ validate: validateTimeWindowUnits }),
  threshold: schema.arrayOf(schema.number(), { minSize: 1, maxSize: 2 }),
  thresholdComparator: getComparatorSchemaType(validateComparator),
  // aggregation type
  aggType: schema.string({ validate: validateAggType, defaultValue: 'count' }),
  // aggregation field
  aggField: schema.maybe(schema.string({ minLength: 1 })),
  // how to group
  groupBy: schema.string({ validate: validateGroupBy, defaultValue: 'all' }),
  // field to group on (for groupBy: top)
  termField: schema.maybe(
    schema.oneOf([
      schema.string({ minLength: 1 }),
      schema.arrayOf(schema.string(), { minSize: 2, maxSize: MAX_SELECTABLE_GROUP_BY_TERMS }),
    ])
  ),
  // limit on number of groups returned
  termSize: schema.maybe(schema.number({ min: 1 })),
  searchType: schema.oneOf(
    [schema.literal('searchSource'), schema.literal('esQuery'), schema.literal('esqlQuery')],
    {
      defaultValue: 'esQuery',
    }
  ),
  timeField: schema.conditional(
    schema.siblingRef('searchType'),
    schema.literal('esQuery'),
    schema.string({ minLength: 1 }),
    schema.maybe(schema.string({ minLength: 1 }))
  ),
  // searchSource rule param only
  searchConfiguration: schema.conditional(
    schema.siblingRef('searchType'),
    schema.literal('searchSource'),
    schema.object({}, { unknowns: 'allow' }),
    schema.never()
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
    schema.never()
  ),
  // esqlQuery rule params only
  esqlQuery: schema.conditional(
    schema.siblingRef('searchType'),
    schema.literal('esqlQuery'),
    schema.object({ esql: schema.string({ minLength: 1 }) }),
    schema.never()
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
function validateParams(anyParams: unknown): string | undefined {
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
    if (isEsqlQueryRule(searchType)) {
      return i18n.translate('xpack.responseOps.ruleParams.esQuery.invalidTopGroupByErrorMessage', {
        defaultMessage: '[groupBy]: groupBy should be all or row when [searchType] is esqlQuery',
      });
    }

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

  if (groupBy === 'row' && !isEsqlQueryRule(searchType)) {
    return i18n.translate('xpack.responseOps.ruleParams.esQuery.invalidRowGroupByErrorMessage', {
      defaultMessage: '[groupBy]: groupBy must be all or top when [searchType] is not esqlQuery',
    });
  }

  if (isSearchSourceRule(searchType)) {
    return;
  }

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
