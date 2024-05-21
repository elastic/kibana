/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { intersection, isObject, isUndefined } from 'lodash';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { getFields } from './utils/get_fields';
import { getDataViewFieldSubtypeNested } from '../../utils';
import { getFullFieldNameNode } from './utils/get_full_field_name_node';
import type { DataViewBase, DataViewFieldBase, KueryQueryOptions } from '../../..';
import { KqlFunctionNode, KqlLiteralNode, KqlWildcardNode, nodeTypes } from '../node_types';
import type { KqlContext, KueryNode } from '../types';

import * as ast from '../ast';
import * as literal from '../node_types/literal';
import * as wildcard from '../node_types/wildcard';
import * as is from './is';

export const KQL_FUNCTION_INFER = 'infer';

export interface KqlInferFunctionNode extends KqlFunctionNode {
  function: typeof KQL_FUNCTION_INFER;
  arguments: [KqlLiteralNode | KqlWildcardNode, KqlLiteralNode | KqlWildcardNode];
}

export function isNode(node: KqlFunctionNode): node is KqlInferFunctionNode {
  return node.function === KQL_FUNCTION_INFER;
}

const isKueryNode = (node: unknown): node is KueryNode => isObject(node) && 'type' in node;

export const nodeContains = (node: unknown) => {
  return (
    isKueryNode(node) &&
    nodeTypes.function.isNode(node) &&
    (isNode(node) || node.arguments.some(nodeContains))
  );
};

export function buildNodeParams(fieldName: string, value: any) {
  if (isUndefined(fieldName)) {
    throw new Error('fieldName is a required argument');
  }
  if (isUndefined(value)) {
    throw new Error('value is a required argument');
  }
  const fieldNode =
    typeof fieldName === 'string'
      ? ast.fromLiteralExpression(fieldName)
      : literal.buildNode(fieldName);
  const valueNode =
    typeof value === 'string' ? ast.fromLiteralExpression(value) : literal.buildNode(value);
  return {
    arguments: [fieldNode, valueNode],
  };
}

const textExpansionTypes = ['sparse_vector', 'rank_features'];

export function toElasticsearchQuery(
  node: KqlInferFunctionNode,
  indexPattern?: DataViewBase,
  config: KueryQueryOptions = {},
  context: KqlContext = {}
): QueryDslQueryContainer {
  if (!config.textExpansionModel) {
    const isFunctionNode = nodeTypes.function.buildNodeWithArgumentNodes(
      'is',
      node.arguments
    ) as is.KqlIsFunctionNode;

    return is.toElasticsearchQuery(isFunctionNode, indexPattern, config, context);
  }

  const {
    arguments: [fieldNameArg, valueArg],
  } = node;

  const fullFieldNameArg = getFullFieldNameNode(
    fieldNameArg,
    indexPattern,
    context?.nested ? context.nested.path : undefined
  );

  const fieldName = fullFieldNameArg.value ? fullFieldNameArg : nodeTypes.wildcard.buildNode('*');
  const value = isUndefined(valueArg) ? valueArg : ast.toElasticsearchQuery(valueArg);
  const fields = indexPattern ? getFields(fieldName, indexPattern) ?? [] : [];

  // If no fields are found in the index pattern we send through the given field name as-is. We do this to preserve
  // the behaviour of lucene on dashboards where there are panels based on different index patterns that have different
  // fields. If a user queries on a field that exists in one pattern but not the other, the index pattern without the
  // field should return no results. It's debatable whether this is desirable, but it's been that way forever, so we'll
  // keep things familiar for now.
  if (fields.length === 0) {
    fields.push({
      name: ast.toElasticsearchQuery(fullFieldNameArg) as unknown as string,
      scripted: false,
      type: '',
      esTypes: ['sparse_vector'],
    });
  }

  const wrapWithNestedQuery = (field: DataViewFieldBase, query: any) => {
    // Wildcards can easily include nested and non-nested fields. There isn't a good way to let
    // users handle this themselves so we automatically add nested queries in this scenario.
    const subTypeNested = getDataViewFieldSubtypeNested(field);
    if (!wildcard.isNode(fullFieldNameArg) || !subTypeNested?.nested || context?.nested) {
      return query;
    } else {
      return {
        nested: {
          path: subTypeNested.nested.path,
          query,
          score_mode: 'none',
          ...(typeof config.nestedIgnoreUnmapped === 'boolean' && {
            ignore_unmapped: config.nestedIgnoreUnmapped,
          }),
        },
      };
    }
  };

  const queries = fields
    .filter((field) => intersection(field.esTypes, textExpansionTypes).length > 0)
    .map(
      (field: DataViewFieldBase) =>
        wrapWithNestedQuery(field, {
          text_expansion: {
            [field.name]: {
              model_id: config.textExpansionModel,
              model_text: value,
            },
          },
        }),
      []
    );

  return queries.length === 1
    ? queries[0]
    : {
        bool: {
          should: queries,
          minimum_should_match: 1,
        },
      };
}

export function toKqlExpression(node: KqlInferFunctionNode): string {
  const [field, value] = node.arguments;
  if (field.value === null) return `${ast.toKqlExpression(value)}`;
  return `${ast.toKqlExpression(field)} ~ ${ast.toKqlExpression(value)}`;
}
