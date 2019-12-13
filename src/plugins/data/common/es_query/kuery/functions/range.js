/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';
import { nodeTypes } from '../node_types';
import * as ast from '../ast';
import { getRangeScript } from '../../filters';
import { getFields } from './utils/get_fields';
import { getTimeZoneFromSettings } from '../../utils';
import { getFullFieldNameNode } from './utils/get_full_field_name_node';

export function buildNodeParams(fieldName, params) {
  params = _.pick(params, 'gt', 'lt', 'gte', 'lte', 'format');
  const fieldNameArg = typeof fieldName === 'string' ? ast.fromLiteralExpression(fieldName) : nodeTypes.literal.buildNode(fieldName);
  const args = _.map(params, (value, key) => {
    return nodeTypes.namedArg.buildNode(key, value);
  });

  return {
    arguments: [fieldNameArg, ...args],
  };
}

export function toElasticsearchQuery(node, indexPattern = null, config = {}, context = {}) {
  const [ fieldNameArg, ...args ] = node.arguments;
  const fullFieldNameArg = getFullFieldNameNode(fieldNameArg, indexPattern, context.nested ? context.nested.path : undefined);
  const fields = indexPattern ? getFields(fullFieldNameArg, indexPattern) : [];
  const namedArgs = extractArguments(args);
  const queryParams = _.mapValues(namedArgs, ast.toElasticsearchQuery);

  // If no fields are found in the index pattern we send through the given field name as-is. We do this to preserve
  // the behaviour of lucene on dashboards where there are panels based on different index patterns that have different
  // fields. If a user queries on a field that exists in one pattern but not the other, the index pattern without the
  // field should return no results. It's debatable whether this is desirable, but it's been that way forever, so we'll
  // keep things familiar for now.
  if (fields && fields.length === 0) {
    fields.push({
      name: ast.toElasticsearchQuery(fullFieldNameArg),
      scripted: false,
    });
  }


  const queries = fields.map((field) => {
    const wrapWithNestedQuery = (query) => {
      // Wildcards can easily include nested and non-nested fields. There isn't a good way to let
      // users handle this themselves so we automatically add nested queries in this scenario.
      if (
        !fullFieldNameArg.type === 'wildcard'
        || !_.get(field, 'subType.nested')
        || context.nested
      ) {
        return query;
      }
      else {
        return {
          nested: {
            path: field.subType.nested.path,
            query,
            score_mode: 'none'
          }
        };
      }
    };

    if (field.scripted) {
      return {
        script: getRangeScript(field, queryParams),
      };
    }
    else if (field.type === 'date') {
      const timeZoneParam = config.dateFormatTZ ? { time_zone: getTimeZoneFromSettings(config.dateFormatTZ) } : {};
      return wrapWithNestedQuery({
        range: {
          [field.name]: {
            ...queryParams,
            ...timeZoneParam,
          }
        }
      });
    }
    return wrapWithNestedQuery({
      range: {
        [field.name]: queryParams
      }
    });
  });

  return {
    bool: {
      should: queries,
      minimum_should_match: 1
    }
  };
}

function extractArguments(args) {
  if ((args.gt && args.gte) || (args.lt && args.lte)) {
    throw new Error('range ends cannot be both inclusive and exclusive');
  }

  const unnamedArgOrder = ['gte', 'lte', 'format'];

  return args.reduce((acc, arg, index) => {
    if (arg.type === 'namedArg') {
      acc[arg.name] = arg.value;
    }
    else {
      acc[unnamedArgOrder[index]] = arg;
    }

    return acc;
  }, {});
}
