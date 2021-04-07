/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { estypes } from '@elastic/elasticsearch';
import { ObjectType } from '@kbn/config-schema';
import { isPlainObject } from 'lodash';

import { IndexMapping } from '../../../mappings';
import { hasFilterKeyError } from '../filter_utils';
import { aggregationSchemas } from './aggs_types';

const aggregationKeys = ['aggs', 'aggregations'];

export const validateAndConvertAggregations = (
  allowedTypes: string[],
  aggs: Record<string, estypes.AggregationContainer>,
  indexMapping: IndexMapping
): Record<string, estypes.AggregationContainer> => {
  return validateAggregations(aggs as any, {
    allowedTypes,
    indexMapping,
    currentPath: [],
  });
};

interface ValidationContext {
  allowedTypes: string[];
  indexMapping: IndexMapping;
  currentPath: string[];
}

/**
 * Validates a record of aggregation containers,
 * Which can either be the root level aggregations (`SearchRequest.body.aggs`)
 * Or a nested record of aggregation (`SearchRequest.body.aggs.myAggregation.aggs`)
 *
 * @param aggregations
 * @param context
 */
const validateAggregations = (
  aggregations: Record<string, estypes.AggregationContainer>,
  context: ValidationContext
) => {
  return Object.entries(aggregations).reduce((memo, [aggrName, aggrContainer]) => {
    return {
      ...memo,
      [aggrName]: validateAggregation(aggrContainer, childContext(context, aggrName)),
    };
  }, {});
};

const childContext = (context: ValidationContext, path: string): ValidationContext => {
  return {
    ...context,
    currentPath: [...context.currentPath, path],
  };
};

/**
 * Validates an aggregation container, e.g an entry of `SearchRequest.body.aggs`, or
 * from a nested aggregation record.
 *
 * @param aggregation
 * @param context
 */
const validateAggregation = (
  aggregation: estypes.AggregationContainer,
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

const validateAggregationContainer = (
  container: estypes.AggregationContainer,
  context: ValidationContext
) => {
  return Object.entries(container).reduce((memo, [aggName, aggregation]) => {
    if (aggregationKeys.includes(aggName)) {
      return memo;
    }
    return {
      ...memo,
      [aggName]: validateAggregationType(aggName, aggregation, childContext(context, aggName)),
    };
  }, {} as estypes.AggregationContainer);
};

const validateAggregationType = (
  aggregationType: string,
  aggregation: Record<string, any>,
  context: ValidationContext
) => {
  const aggregationSchema = aggregationSchemas[aggregationType];
  if (!aggregationSchema) {
    throw new Error(`${aggregationType} aggregation is not valid (or not registered yet)`);
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
const attributeFields = ['field'];
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

    const newKey = rewriteKey ? validateAndRewriteKey(key, context) : key;
    const newValue = rewriteValue
      ? validateAndRewriteValue(key, value, context)
      : isPlainObject(value)
      ? recursiveRewrite(value, context, [...parents, key])
      : value;

    return {
      ...memo,
      [newKey]: newValue,
    };
  }, {});
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

const validateAndRewriteValue = (
  fieldName: string,
  fieldValue: any,
  { allowedTypes, indexMapping }: ValidationContext
) => {
  const error = hasFilterKeyError(fieldValue, allowedTypes, indexMapping);
  if (error) {
    throw new Error(error); // TODO: encapsulate
  }
  return stripAttributesPath(fieldValue);
};

const validateAndRewriteKey = (
  fieldName: string,
  { allowedTypes, indexMapping }: ValidationContext
) => {
  const error = hasFilterKeyError(fieldName, allowedTypes, indexMapping);
  if (error) {
    throw new Error(error); // TODO: encapsulate
  }
  return stripAttributesPath(fieldName);
};

const stripAttributesPath = (fieldName: string) => fieldName.replace('.attributes', '');
