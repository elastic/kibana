/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IndicesQuerySourceFields } from '../types';

type IndexFields = Record<string, string[]>;

export function createQuery(fields: IndexFields, fieldDescriptors: IndicesQuerySourceFields) {
  const boolMatches = Object.keys(fields).reduce((acc, index) => {
    const indexFields = fields[index];
    const indexFieldDescriptors = fieldDescriptors[index];

    const matchRules = indexFields.map((field) => {
      const elserField = indexFieldDescriptors.elser_query_fields.find((x) => x.field === field);
      if (elserField) {
        return {
          text_expansion: {
            [elserField.field]: {
              model_id: elserField.model_id,
              model_text: '{query}',
            },
          },
        };
      }
    });

    return [...acc, ...matchRules];
  }, []);

  return {
    bool: {
      should: boolMatches,
      minimum_should_match: 1,
    },
  };
}
