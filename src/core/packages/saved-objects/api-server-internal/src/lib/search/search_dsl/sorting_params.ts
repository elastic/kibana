/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import type { SortCombinations, SortOrder } from '@elastic/elasticsearch/lib/api/types';
import type { SavedObjectsPitParams } from '@kbn/core-saved-objects-api-server/src/apis';
import { getProperty, type IndexMapping } from '@kbn/core-saved-objects-base-server-internal';

const TOP_LEVEL_FIELDS = ['_id', '_score'];

export function getSortingParams(
  mappings: IndexMapping,
  type: string | string[],
  sortField?: string,
  sortOrder?: SortOrder,
  pit?: SavedObjectsPitParams
): { sort?: SortCombinations[]; runtime_mappings?: Record<string, any> } {
  if (!sortField) {
    // if we are performing a PIT search, we must sort by some criteria
    // in order to get the 'sort' property for each of the results.
    // Defaulting to '_shard_doc' tells ES to sort by the natural stored order,
    // giving the best performance
    return pit ? { sort: ['_shard_doc'] } : {};
  }

  const types = Array.isArray(type) ? type : [type];

  if (TOP_LEVEL_FIELDS.includes(sortField)) {
    return {
      sort: [
        {
          [sortField]: {
            order: sortOrder,
          },
        },
      ],
    };
  }

  if (types.length > 1) {
    const rootField = getProperty(mappings, sortField);
    if (rootField) {
      // If rootField is text with keyword, use keyword for sorting
      let sortKey = sortField;
      if (rootField.type === 'text' && rootField.fields && rootField.fields.keyword) {
        sortKey = `${sortField}.keyword`;
      }
      return {
        sort: [
          {
            [sortKey]: {
              order: sortOrder,
              unmapped_type: rootField.type,
            },
          },
        ],
      };
    } else {
      // Only create a runtime field if the sort field is present in all types
      const allTypesHaveField = types.every((t) => !!getProperty(mappings, `${t}.${sortField}`));
      if (allTypesHaveField) {
        // Throw error if any field is text without keyword subfield
        for (const t of types) {
          const fieldMapping = getProperty(mappings, `${t}.${sortField}`);
          if (
            fieldMapping &&
            fieldMapping.type === 'text' &&
            (!fieldMapping.fields || !fieldMapping.fields.keyword)
          ) {
            throw Boom.badRequest(
              `Sort field "${t}.${sortField}" is of type "text" and does not have a "keyword" subfield. Sorting on text fields requires a keyword subfield.`
            );
          }
        }
        // Determine if any field is text with keyword, and use keyword if so
        const mergedFieldName = `merged_${sortField}`;
        // Instead of emitting only the first found value, emit all possible values for the field across types
        // This ensures that sorting is done across all types as a single field
        // Use if/else if/else to ensure only one emit is called
        const scriptLines = types.map((t, idx) => {
          const fieldName = `${t}.${sortField}`;
          const fieldMapping = getProperty(mappings, fieldName);
          let scriptField = fieldName;
          if (
            fieldMapping &&
            fieldMapping.type === 'text' &&
            fieldMapping.fields &&
            fieldMapping.fields.keyword
          ) {
            scriptField = `${fieldName}.keyword`;
          }
          const prefix = idx === 0 ? 'if' : 'else if';
          return `${prefix} (doc.containsKey('${scriptField}') && doc['${scriptField}'].size() != 0) { emit(doc['${scriptField}'].value); }`;
        });
        scriptLines.push('else { emit(null); }');
        const scriptSource = scriptLines.join(' ');

        return {
          runtime_mappings: {
            [mergedFieldName]: {
              type: 'keyword',
              script: {
                source: scriptSource,
              },
            },
          },
          sort: [
            {
              [mergedFieldName]: {
                order: sortOrder,
              },
            },
          ],
        };
      } else {
        // If not present in all types, throw an error
        throw Boom.badRequest(
          `Sort field "${sortField}" must be present in all types to use in sorting when multiple types are specified.`
        );
      }
    }
  }

  const [typeField] = types;
  let key = `${typeField}.${sortField}`;
  let field = getProperty(mappings, key);
  if (!field) {
    // type field does not exist, try checking the root properties
    key = sortField;
    field = getProperty(mappings, sortField);
    if (!field) {
      throw Boom.badRequest(`Unknown sort field ${sortField}`);
    }
  }

  // Add check for text fields: must have keyword subfield
  if (field.type === 'text' && !key.endsWith('.keyword')) {
    if (field.fields && field.fields.keyword) {
      key = `${key}.keyword`;
    }
  }

  return {
    sort: [
      {
        [key]: {
          order: sortOrder,
          unmapped_type: field.type,
        },
      },
    ],
  };
}
