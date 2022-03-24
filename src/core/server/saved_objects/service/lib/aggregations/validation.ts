/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ObjectType } from '@kbn/config-schema';
import { isPlainObject, isArray } from 'lodash';

import { IndexMapping } from '../../../mappings';
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
      if (aggregationKeys.includes(aggName)) {
        return memo;
      }
      return {
        ...memo,
        [aggName]: validateAggregationType(aggName, aggregation, childContext(context, aggName)),
      };
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
  return validateAndRewriteFieldAttributes(aggregation, context);
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

    return {
      ...memo,
      [newKey]: newValue,
    };
  }, {});
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
  throw new Error(`[${currentPath.join('.')}] Invalid attribute path: ${attributePath}`);
};
