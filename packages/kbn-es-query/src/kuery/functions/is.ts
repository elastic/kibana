/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isUndefined } from 'lodash';
import type { DataViewBase, DataViewFieldBase, DslQuery, KueryQueryOptions } from '../..';
import type { KqlFunctionNode } from '../node_types/function';
import type { KqlLiteralNode } from '../node_types/literal';
import type { KqlContext } from '../types';
import { getPhraseScript } from '../../filters';
import { getDataViewFieldSubtypeNested, getTimeZoneFromSettings } from '../../utils';
import * as ast from '../ast';
import { KQL_WILDCARD_SYMBOL, KqlWildcardNode, toQueryStringQuery } from '../node_types/wildcard';
import { getFields } from './utils/get_fields';
import { getFullFieldNameNode } from './utils/get_full_field_name_node';

export const KQL_FUNCTION_NAME_IS = 'is';

export interface KqlIsFunctionNode extends KqlFunctionNode {
  function: typeof KQL_FUNCTION_NAME_IS;
  arguments: [
    KqlLiteralNode | KqlWildcardNode, // Field name
    KqlLiteralNode | KqlWildcardNode, // Value
    KqlLiteralNode // Is this a "phrase" value? (surrounded in quotes)
  ];
}

export function isNode(node: KqlFunctionNode): node is KqlIsFunctionNode {
  return node.function === KQL_FUNCTION_NAME_IS;
}

export function toElasticsearchQuery(
  { arguments: [fieldNameArg, valueArg, isPhraseArg] }: KqlIsFunctionNode,
  indexPattern?: DataViewBase,
  config: KueryQueryOptions = {},
  context: KqlContext = {}
): DslQuery {
  const isExistsQuery = valueArg.type === 'wildcard' && valueArg.value === KQL_WILDCARD_SYMBOL;
  const isAllFieldsQuery =
    fieldNameArg.type === 'wildcard' && fieldNameArg.value === KQL_WILDCARD_SYMBOL;
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
  const type = isPhraseArg.value ? 'phrase' : 'best_fields';
  if (fullFieldNameArg.value === null) {
    if (valueArg.type === 'wildcard') {
      return {
        query_string: {
          query: toQueryStringQuery(valueArg),
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

  // Special case for wildcards where there are no fields or all fields share the same prefix
  if (isExistsQuery && (!fields?.length || fields?.length === indexPattern?.fields.length)) {
    return { match_all: {} };
  }

  const queries = fields!.reduce((accumulator: any, field: DataViewFieldBase) => {
    const wrapWithNestedQuery = (query: any) => {
      // Wildcards can easily include nested and non-nested fields. There isn't a good way to let
      // users handle this themselves so we automatically add nested queries in this scenario.
      const subTypeNested = getDataViewFieldSubtypeNested(field);
      if (!(fullFieldNameArg.type === 'wildcard') || !subTypeNested?.nested || context?.nested) {
        return query;
      } else {
        return {
          nested: {
            path: subTypeNested.nested.path,
            query,
            score_mode: 'none',
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
    } else if (valueArg.type === 'wildcard') {
      return [
        ...accumulator,
        wrapWithNestedQuery({
          query_string: {
            fields: [field.name],
            query: toQueryStringQuery(valueArg),
          },
        }),
      ];
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
