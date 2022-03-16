/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { nodeTypes } from '../node_types';
import * as ast from '../ast';
import { getRangeScript, RangeFilterParams } from '../../filters';
import { getFields } from './utils/get_fields';
import { getDataViewFieldSubtypeNested, getTimeZoneFromSettings } from '../../utils';
import { getFullFieldNameNode } from './utils/get_full_field_name_node';
import type { DataViewBase, KueryNode, KueryQueryOptions } from '../..';

export function buildNodeParams(
  fieldName: string,
  operator: keyof Pick<RangeFilterParams, 'gt' | 'gte' | 'lt' | 'lte'>,
  value: number | string
) {
  // Run through the parser instead treating it as a literal because it may contain wildcards
  const fieldNameArg = ast.fromLiteralExpression(fieldName);
  const valueArg = nodeTypes.literal.buildNode(value);
  return { arguments: [fieldNameArg, operator, valueArg] };
}

export function toElasticsearchQuery(
  node: KueryNode,
  indexPattern?: DataViewBase,
  config: KueryQueryOptions = {},
  context: Record<string, any> = {}
): estypes.QueryDslQueryContainer {
  const [fieldNameArg, operatorArg, valueArg] = node.arguments;
  const fullFieldNameArg = getFullFieldNameNode(
    fieldNameArg,
    indexPattern,
    context?.nested ? context.nested.path : undefined
  );
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

  const queries = fields!.map((field) => {
    const wrapWithNestedQuery = (query: any) => {
      // Wildcards can easily include nested and non-nested fields. There isn't a good way to let
      // users handle this themselves so we automatically add nested queries in this scenario.
      const subTypeNested = getDataViewFieldSubtypeNested(field);
      if (!(fullFieldNameArg.type === 'wildcard') || !subTypeNested?.nested || context!.nested) {
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

    const queryParams = {
      [operatorArg]: ast.toElasticsearchQuery(valueArg),
    };

    if (field.scripted) {
      return {
        script: getRangeScript(field, queryParams),
      };
    } else if (field.type === 'date') {
      const timeZoneParam = config.dateFormatTZ
        ? { time_zone: getTimeZoneFromSettings(config!.dateFormatTZ) }
        : {};
      return wrapWithNestedQuery({
        range: {
          [field.name]: {
            ...queryParams,
            ...timeZoneParam,
          },
        },
      });
    }
    return wrapWithNestedQuery({
      range: {
        [field.name]: queryParams,
      },
    });
  });

  return {
    bool: {
      should: queries,
      minimum_should_match: 1,
    },
  };
}
