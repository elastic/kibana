/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import {
  MappingRuntimeFields,
  MappingRuntimeFieldType,
  SortCombinations,
  SortOrder,
} from '@elastic/elasticsearch/lib/api/types';
import type { SavedObjectsPitParams } from '@kbn/core-saved-objects-api-server/src/apis';
import { getProperty, type IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import type { SavedObjectsFieldMapping } from '@kbn/core-saved-objects-server';
import {
  getKeywordField,
  isValidSortingField,
  normalizeFieldType,
  validateFieldTypeCompatibility,
} from './sorting_params_utils';

const TOP_LEVEL_FIELDS = ['_id', '_score'];

export function getSortingParams(
  mappings: IndexMapping,
  type: string | string[],
  sortField?: string,
  sortOrder?: SortOrder,
  pit?: SavedObjectsPitParams
): { sort?: SortCombinations[]; runtime_mappings?: MappingRuntimeFields } {
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
      return {
        sort: [
          {
            [sortField]: {
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
        // Validate that all fields are sortable to prevent dangerous inconsistencies.
        //
        // NOTE: While it would be technically possible to make text fields without
        // keyword subfields work in multi-type scenarios using runtime fields, this
        // would create inconsistent behavior where the same field is sortable when
        // querying multiple types but fails when querying a single type.
        //
        // This inconsistency would be confusing and error-prone for users, so we
        // explicitly require keyword subfields for all text field sorting.
        for (const t of types) {
          const fieldMapping = getProperty(mappings, `${t}.${sortField}`);
          if (!isValidSortingField(fieldMapping) && fieldMapping) {
            throw Boom.badRequest(
              `Sort field "${t}.${sortField}" is of type "${
                fieldMapping.type
              }" which is not sortable.${
                fieldMapping.type === 'text'
                  ? ' Sorting on text fields requires a "keyword" subfield.'
                  : ''
              }`
            );
          }
        }
        // Collect field mappings for type detection
        const fieldMappings = types
          .map((t) => getProperty(mappings, `${t}.${sortField}`))
          .filter(Boolean) as SavedObjectsFieldMapping[];

        // First normalize all field types, then validate compatibility
        const normalizedTypes = fieldMappings.map(normalizeFieldType);
        const validationResult = validateFieldTypeCompatibility(normalizedTypes);
        if (!validationResult.isValid) {
          throw Boom.badRequest(
            `Sort field "${sortField}" has incompatible types across saved object types: [${validationResult.conflictingTypes.join(
              ', '
            )}]. All field types must be compatible for sorting (numeric types are considered equivalent).`
          );
        }

        const mergedFieldName = `merged_${sortField}`;
        const mergedFieldType = (normalizedTypes[0] ?? 'keyword') as MappingRuntimeFieldType;

        // Instead of emitting only the first found value, emit all possible values for the field across types
        // This ensures that sorting is done across all types as a single field
        // Use if/else if/else to ensure only one emit is called
        const scriptLines = types.map((t, idx) => {
          const fieldName = `${t}.${sortField}`;
          const fieldMapping = getProperty(mappings, fieldName);
          let scriptField = fieldName;
          const keywordSubField = getKeywordField(fieldMapping);
          if (keywordSubField) {
            scriptField = `${fieldName}.${keywordSubField}`;
          }
          const prefix = idx === 0 ? 'if' : 'else if';
          return `${prefix} (doc.containsKey('${scriptField}') && doc['${scriptField}'].size() != 0) { emit(doc['${scriptField}'].value); }`;
        });
        // Only emit else { emit("") } for keyword type, otherwise omit else for proper sorting
        if (mergedFieldType === 'keyword') {
          scriptLines.push('else { emit(""); }');
        }
        const scriptSource = scriptLines.join(' ');

        return {
          runtime_mappings: {
            [mergedFieldName]: {
              type: mergedFieldType,
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
        // this ensures that we do not attempt to sort by a field that is not available in all types
        // but this can be relaxed if needed since ES allows sorting by fields that are not present in all documents
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
