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
import {
  isValidSortingField,
  normalizeNumericTypes,
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
    // For multi-type queries, use runtime field to merge type and root fields with consistent precedence:
    // Prefer type-level field if it exists, otherwise fallback to root-level field
    const rootField = getProperty(mappings, sortField);

    // Check that ALL types have the field available (either at type level or root level)
    const allTypesHaveField = types.every((t) => {
      const typeField = getProperty(mappings, `${t}.${sortField}`);
      return !!typeField || !!rootField;
    });

    // Validation: If field is not available for ALL types (either at type or root level), throw an error
    if (!allTypesHaveField) {
      throw Boom.badRequest(
        `Sort field "${sortField}" is not available for all specified types. Each type must have the field defined either at the type level or root level.`
      );
    }

    // Use consistent precedence for multi-type queries:
    // For multi-type: prefer root-level field if it exists, otherwise use type-level field
    // This maintains existing Kibana behavior for multi-type queries
    const typeFieldChoices = types.map((t) => {
      const typeField = getProperty(mappings, `${t}.${sortField}`);
      if (rootField) {
        return { fieldPath: sortField, mapping: rootField }; // Use root-level field if available
      } else {
        return { fieldPath: `${t}.${sortField}`, mapping: typeField! }; // Use type-level field
      }
    });

    // Validate that all chosen fields are sortable (fail fast before optimization decisions)
    const invalidField = typeFieldChoices.find((choice) => !isValidSortingField(choice.mapping));
    if (invalidField) {
      const fieldType = invalidField.mapping.type;
      throw Boom.badRequest(
        `Sort field "${invalidField.fieldPath}" is of type "${fieldType}" which is not sortable. If the field has a sortable subfield e.g "keyword" subfield, use "field.keyword" for sorting.`
      );
    }

    // Check if all types are using the root field (no type-specific fields)
    const allUsingRootField = typeFieldChoices.every((choice) => choice.fieldPath === sortField);

    if (allUsingRootField) {
      // All types use the root field - sort directly on root field without runtime mapping
      return {
        sort: [
          {
            [sortField]: {
              order: sortOrder,
              unmapped_type: rootField!.type,
            },
          },
        ],
      };
    }

    // Mixed case: some types use type fields, some use root field - need runtime mapping
    // Collect the actual field mappings we'll use for type detection
    const fieldMappings = typeFieldChoices.map((choice) => choice.mapping);

    // First normalize all field types, then validate compatibility
    const normalizedTypes = fieldMappings.map(normalizeNumericTypes);
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

    const scriptLines = types.map((t, idx) => {
      const chosenField = typeFieldChoices[idx].fieldPath;
      const prefix = idx === 0 ? 'if' : 'else if';
      return `${prefix} (doc.containsKey('type') && doc['type'].size() != 0 && doc['type'].value == '${t}') { if (doc.containsKey('${chosenField}') && doc['${chosenField}'].size() != 0) { emit(doc['${chosenField}'].value); } }`;
    });

    // Only emit empty string for keyword type for proper sorting on other field types
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
