/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { QueryDslTextExpansionQuery } from '@elastic/elasticsearch/lib/api/types';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { IndicesQuerySourceFields } from '../types';

export const getElasticsearchQuery = (
  queryFields: string[],
  fieldsDescriptor: IndicesQuerySourceFields
) => {
  const boolMatches = Object.keys(fieldsDescriptor).reduce<QueryDslQueryContainer[]>(
    (acc, index: string) => {
      const indexFieldDescriptors = fieldsDescriptor[index];

      const matchRules: QueryDslQueryContainer[] = queryFields
        .map((field) => {
          const elserField = indexFieldDescriptors.elser_query_fields.find(
            (x) => x.field === field
          );
          if (elserField) {
            return {
              text_expansion: {
                [elserField.field]: {
                  model_id: elserField.model_id,
                  model_text: '{query}',
                },
              } as unknown as QueryDslTextExpansionQuery,
            };
          }
          return {};
        })
        .filter((x) => Object.keys(x).length > 0);

      return [...acc, ...matchRules];
    },
    []
  );

  return {
    bool: {
      should: boolMatches,
      minimum_should_match: 1,
    },
  };
};
