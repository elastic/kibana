/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ObjectType } from '@kbn/config-schema';
import { isPlainObject, isArray, castArray } from 'lodash';
import { ACL_FIELD } from '@kbn/ols';

import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import { getRootFields, matchesAclField } from '../../utils';
import {
  isObjectTypeAttribute,
  rewriteObjectTypeAttribute,
  isRootLevelAttribute,
  rewriteRootLevelAttribute,
} from './validation_utils';
import { aggregationSchemas } from './aggs_types';

const aggregationKeys = ['aggs', 'aggregations'];

interface ValidationContext {
  allowedTypes: string[];
  indexMapping: IndexMapping;
  currentPath: string[];
}

/**
 * Validate an aggregation structure against the declared mappings and
 * aggregation schemas, and rewrite the attribute fields using the KQL-like syntax
 * - `{type}.attributes.{attribute}` to `{type}.{attribute}`
 * - `{type}.{rootField}` to `{rootField}`
 *
 * throws on the first validation error if any is encountered.
 */
export const validateAndConvertAggregations = (
  allowedTypes: string[],
  aggs: Record<string, estypes.AggregationsAggregationContainer>,
  indexMapping: IndexMapping
): Record<string, estypes.AggregationsAggregationContainer> => {
  return validateAggregations(aggs, {
    allowedTypes,
    indexMapping,
    currentPath: [],
  });
};

/**
 * Validate a record of aggregation containers,
 * Which can either be the root level aggregations (`SearchRequest.body.aggs`)
 * Or a nested record of aggregation (`SearchRequest.body.aggs.myAggregation.aggs`)
 */
const validateAggregations = (
  aggregations: Record<string, estypes.AggregationsAggregationContainer>,
  context: ValidationContext
) => {
  return Object.entries(aggregations).reduce<
    Record<string, estypes.AggregationsAggregationContainer>
  >((memo, [aggrName, aggrContainer]) => {
    memo[aggrName] = validateAggregation(aggrContainer, childContext(context, aggrName));
    return memo;
  }, {});
};

/**
 * Validate an aggregation container, e.g an entry of `SearchRequest.body.aggs`, or
 * from a nested aggregation record, including its potential nested aggregations.
 */
const validateAggregation = (
  aggregation: estypes.AggregationsAggregationContainer,
  context: ValidationContext
) => {
  const container = validateAggregationContainer(aggregation, context);

  if (aggregation.aggregations) {
    container.aggregations = validateAggregations(
      aggregation.aggregations,
      childContext(context, 'aggregations')
    );
  }
  if (aggregation.aggs) {
    container.aggs = validateAggregations(aggregation.aggs, childContext(context, 'aggs'));
  }

  return container;
};

/**
 * Validates root-level aggregation of given aggregation container
 * (ignoring its nested aggregations)
 */
const validateAggregationContainer = (
  container: estypes.AggregationsAggregationContainer,
  context: ValidationContext
) => {
  return Object.entries(container).reduce<estypes.AggregationsAggregationContainer>(
    (memo, [aggName, aggregation]) => {
      if (!aggregationKeys.includes(aggName)) {
        (memo as Record<string, unknown>)[aggName] = validateAggregationType(
          aggName,
          aggregation,
          childContext(context, aggName)
        );
      }
      return memo;
    },
    {}
  );
};

const validateAggregationType = (
  aggregationType: string,
  aggregation: Record<string, any>,
  context: ValidationContext
) => {
  const aggregationSchema = aggregationSchemas[aggregationType];
  if (!aggregationSchema) {
    throw new Error(
      `[${context.currentPath.join(
        '.'
      )}] ${aggregationType} aggregation is not valid (or not registered yet)`
    );
  }

  validateAggregationStructure(aggregationSchema, aggregation, context);
  const rewritten = validateAndRewriteFieldAttributes(aggregation, context);
  return aggregationType === 'top_hits' ? hideAclFromTopHits(rewritten, context) : rewritten;
};

/** Source filter patterns that keep the stored ACL out of returned documents. */
const ACL_SOURCE_EXCLUDES = [ACL_FIELD, `${ACL_FIELD}.*`];

/**
 * Keeps the stored ACL out of the documents that a `top_hits` aggregation returns. Its source filter
 * always excludes the ACL. `docvalue_fields` and `highlight` accept any field, as before, because
 * `find` removes the ACL values they return (see `removeAclFromTopHits`). A sort on the ACL is
 * refused, because the order of the hits would still show the ACL values.
 */
const hideAclFromTopHits = (
  topHits: Record<string, any>,
  { currentPath }: ValidationContext
): Record<string, any> => {
  const aclSortField = castArray(topHits.sort ?? [])
    .flatMap((sort) => (isPlainObject(sort) ? Object.keys(sort) : [sort]))
    .find((name): name is string => typeof name === 'string' && matchesAclField(name));
  if (aclSortField !== undefined) {
    throw new Error(`[${currentPath.join('.')}] Invalid attribute path: ${aclSortField}`);
  }

  const { _source: source } = topHits;
  if (source === false) {
    return topHits;
  }
  return {
    ...topHits,
    _source: {
      ...(source === undefined || source === true ? {} : { includes: castArray(source) }),
      excludes: ACL_SOURCE_EXCLUDES,
    },
  };
};

/**
 * Validate an aggregation structure against its declared schema.
 */
const validateAggregationStructure = (
  schema: ObjectType,
  aggObject: unknown,
  context: ValidationContext
) => {
  return schema.validate(aggObject, {}, context.currentPath.join('.'));
};

/**
 * List of fields that have an attribute path as value
 *
 * @example
 * ```ts
 * avg: {
 *  field: 'alert.attributes.actions.group',
 * },
 * ```
 */
const attributeFields = ['field', 'path'];
/**
 * List of fields that have a Record<attribute path, value> as value
 *
 * @example
 * ```ts
 * filter: {
 *  term: {
 *    'alert.attributes.actions.group': 'value'
 *  },
 * },
 * ```
 */
const attributeMaps = ['term'];

const validateAndRewriteFieldAttributes = (
  aggregation: Record<string, any>,
  context: ValidationContext
) => {
  return recursiveRewrite(aggregation, context, []);
};

const recursiveRewrite = (
  currentLevel: Record<string, any>,
  context: ValidationContext,
  parents: string[]
): Record<string, any> => {
  return Object.entries(currentLevel).reduce((memo, [key, value]) => {
    // `range` keys are field names that are not validated or rewritten, so only the ACL is refused.
    if (lastParent(parents) === 'range' && matchesAclField(key)) {
      throw new Error(
        `[${[...context.currentPath, key].join('.')}] Invalid attribute path: ${key}`
      );
    }
    const rewriteKey = isAttributeKey(parents);
    const rewriteValue = isAttributeValue(key, value);

    const nestedContext = childContext(context, key);
    const newKey = rewriteKey ? validateAndRewriteAttributePath(key, nestedContext) : key;

    let newValue = value;
    if (rewriteValue) {
      newValue = validateAndRewriteAttributePath(value, nestedContext);
    } else if (isArray(value)) {
      newValue = value.map((v) =>
        isPlainObject(v) ? recursiveRewrite(v, nestedContext, parents) : v
      );
    } else if (isPlainObject(value)) {
      newValue = recursiveRewrite(value, nestedContext, [...parents, key]);
    }

    memo[newKey] = newValue;
    return memo;
  }, {} as Record<string, unknown>);
};

const childContext = (context: ValidationContext, path: string): ValidationContext => {
  return {
    ...context,
    currentPath: [...context.currentPath, path],
  };
};

const lastParent = (parents: string[]) => {
  if (parents.length) {
    return parents[parents.length - 1];
  }
  return undefined;
};

const isAttributeKey = (parents: string[]) => {
  const last = lastParent(parents);
  if (last) {
    return attributeMaps.includes(last);
  }
  return false;
};

const isAttributeValue = (fieldName: string, fieldValue: unknown): boolean => {
  return attributeFields.includes(fieldName) && typeof fieldValue === 'string';
};

const isRootField = (fieldName: string): boolean => {
  return getRootFields().includes(fieldName);
};

const validateAndRewriteAttributePath = (
  attributePath: string,
  { allowedTypes, indexMapping, currentPath }: ValidationContext
) => {
  if (isRootLevelAttribute(attributePath, indexMapping, allowedTypes)) {
    return rewriteRootLevelAttribute(attributePath);
  }
  if (isObjectTypeAttribute(attributePath, indexMapping, allowedTypes)) {
    return rewriteObjectTypeAttribute(attributePath);
  }
  if (isRootField(attributePath)) {
    return attributePath;
  }
  throw new Error(`[${currentPath.join('.')}] Invalid attribute path: ${attributePath}`);
};
