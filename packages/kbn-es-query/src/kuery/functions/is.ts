/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isUndefined } from 'lodash';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { getPhraseScript } from '../../filters';
import { getFields } from './utils/get_fields';
import { getTimeZoneFromSettings, getDataViewFieldSubtypeNested } from '../../utils';
import { getFullFieldNameNode } from './utils/get_full_field_name_node';
import type { DataViewBase, DataViewFieldBase, KueryQueryOptions } from '../../..';
import type { KqlFunctionNode, KqlLiteralNode, KqlWildcardNode } from '../node_types';
import type { KqlContext } from '../types';

import * as ast from '../ast';
import * as literal from '../node_types/literal';
import * as wildcard from '../node_types/wildcard';

export const KQL_FUNCTION_IS = 'is';

export interface KqlIsFunctionNode extends KqlFunctionNode {
  function: typeof KQL_FUNCTION_IS;
  arguments: [KqlLiteralNode | KqlWildcardNode, KqlLiteralNode | KqlWildcardNode];
}

export function isNode(node: KqlFunctionNode): node is KqlIsFunctionNode {
  return node.function === KQL_FUNCTION_IS;
}

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

export function toElasticsearchQuery(
  node: KqlIsFunctionNode,
  indexPattern?: DataViewBase,
  config: KueryQueryOptions = {},
  context: KqlContext = {}
): QueryDslQueryContainer {
  const {
    arguments: [fieldNameArg, valueArg],
  } = node;

  const isExistsQuery = wildcard.isNode(valueArg) && wildcard.isLoneWildcard(valueArg);
  const isAllFieldsQuery = wildcard.isNode(fieldNameArg) && wildcard.isLoneWildcard(fieldNameArg);
  const isMatchAllQuery = isExistsQuery && isAllFieldsQuery;

  if (isMatchAllQuery) {
    return { match_all: {} };
  }

  const fullFieldNameArg = getFullFieldNameNode(
    fieldNameArg,
    indexPattern,
    context?.nested ? context.nested.path : undefined
  );
  const value = !isUndefined(valueArg) ? ast.toElasticsearchQuery(valueArg) : valueArg;
  const type = valueArg.isQuoted ? 'phrase' : 'best_fields';
  if (fullFieldNameArg.value === null) {
    if (wildcard.isNode(valueArg)) {
      return {
        query_string: {
          query: wildcard.toQueryStringQuery(valueArg),
        },
      };
    }

    return {
      multi_match: {
        type,
        query: value as unknown as string,
        lenient: true,
      },
    };
  }

  const fields = indexPattern ? getFields(fullFieldNameArg, indexPattern) : [];
  // If no fields are found in the index pattern we send through the given field name as-is. We do this to preserve
  // the behaviour of lucene on dashboards where there are panels based on different index patterns that have different
  // fields. If a user queries on a field that exists in one pattern but not the other, the index pattern without the
  // field should return no results. It's debatable whether this is desirable, but it's been that way forever, so we'll
  // keep things familiar for now.
  if (fields && fields.length === 0) {
    fields.push({
      name: ast.toElasticsearchQuery(fullFieldNameArg) as unknown as string,
      scripted: false,
      type: '',
    });
  }

  const queries = fields!.reduce((accumulator: any, field: DataViewFieldBase) => {
    const isKeywordField = field.esTypes?.length === 1 && field.esTypes.includes('keyword');
    const wrapWithNestedQuery = (query: any) => {
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

    if (field.scripted) {
      // Exists queries don't make sense for scripted fields
      if (!isExistsQuery) {
        return [
          ...accumulator,
          {
            script: {
              ...getPhraseScript(field, value as any),
            },
          },
        ];
      }
    } else if (isExistsQuery) {
      return [
        ...accumulator,
        wrapWithNestedQuery({
          exists: {
            field: field.name,
          },
        }),
      ];
    } else if (wildcard.isNode(valueArg)) {
      const query = isKeywordField
        ? {
            wildcard: {
              [field.name]: {
                value: wildcard.toQueryStringQuery(valueArg),
                ...(typeof config.caseInsensitive === 'boolean' && {
                  case_insensitive: config.caseInsensitive,
                }),
              },
            },
          }
        : {
            query_string: {
              fields: [field.name],
              query: wildcard.toQueryStringQuery(valueArg),
            },
          };

      return [...accumulator, wrapWithNestedQuery(query)];
    } else if (field.type === 'date') {
      /*
      If we detect that it's a date field and the user wants an exact date, we need to convert the query to both >= and <= the value provided to force a range query. This is because match and match_phrase queries do not accept a timezone parameter.
      dateFormatTZ can have the value of 'Browser', in which case we guess the timezone using moment.tz.guess.
    */
      const timeZoneParam = config.dateFormatTZ
        ? { time_zone: getTimeZoneFromSettings(config!.dateFormatTZ) }
        : {};
      return [
        ...accumulator,
        wrapWithNestedQuery({
          range: {
            [field.name]: {
              gte: value,
              lte: value,
              ...timeZoneParam,
            },
          },
        }),
      ];
    } else if (isKeywordField) {
      return [
        ...accumulator,
        wrapWithNestedQuery({
          term: {
            [field.name]: {
              value,
              ...(typeof config.caseInsensitive === 'boolean' && {
                case_insensitive: config.caseInsensitive,
              }),
            },
          },
        }),
      ];
    } else {
      const queryType = type === 'phrase' ? 'match_phrase' : 'match';
      return [
        ...accumulator,
        wrapWithNestedQuery({
          [queryType]: {
            [field.name]: value,
          },
        }),
      ];
    }
  }, []);

  return {
    bool: {
      should: queries || [],
      minimum_should_match: 1,
    },
  };
}

export function toKqlExpression(node: KqlIsFunctionNode): string {
  const [field, value] = node.arguments;
  if (field.value === null) return `${ast.toKqlExpression(value)}`;
  return `${ast.toKqlExpression(field)}: ${ast.toKqlExpression(value)}`;
}
