/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { uniq } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { castEsToKbnFieldTypeName } from '@kbn/field-types';
import { shouldReadFieldFromDocValues } from './should_read_field_from_doc_values';
import { FieldDescriptor } from '../../../fetcher';

/**
 *  Read the response from the _field_caps API to determine the type and
 *  "aggregatable"/"searchable" status of each field.
 *
 *  For reference, the _field_caps response should look like this:
 *
 *  {
 *    "fields": {
 *      "<fieldName>": {
 *        "<esType>": {
 *          "type": "<esType>",
 *          "searchable": true,
 *          "aggregatable": false,
 *          // "indices" is only included when multiple
 *          // types are found for a single field
 *          "indices": [
 *            "<index>"
 *          ]
 *        },
 *        "<esType2>": {
 *          "type": "<esType2>",
 *          "searchable": true,
 *          ...
 *
 *  Returned array includes an object for each field in the _field_caps
 *  response. When the field uses the same configuration across all indices
 *  it should look something like this:
 *
 *    {
 *      "name": "<fieldName>"
 *      "type": "<kbnType>",
 *      "aggregatable": <bool>,
 *      "searchable": <bool>,
 *    }
 *
 *  If the field has different data types in indices it will be of type
 *  "conflict" and include a description of where conflicts can be found
 *
 *    {
 *      "name": "<fieldName>",
 *      "type": "conflict",
 *      "aggregatable": false,
 *      "searchable": false,
 *      conflictDescriptions: {
 *        "<esType1>": [
 *          "<index1>"
 *        ],
 *        "<esType2>": [
 *          "<index2>"
 *        ]
 *      }
 *    }
 *
 *  @param {FieldCapsResponse} fieldCapsResponse
 *  @return {Array<FieldDescriptor>}
 */
export function readFieldCapsResponse(
  fieldCapsResponse: estypes.FieldCapsResponse
): FieldDescriptor[] {
  const capsByNameThenType = fieldCapsResponse.fields;

  const kibanaFormattedCaps = Object.keys(capsByNameThenType).reduce<{
    array: FieldDescriptor[];
    hash: Record<string, FieldDescriptor>;
  }>(
    (agg, fieldName) => {
      const capsByType = capsByNameThenType[fieldName];
      const types = Object.keys(capsByType);

      // If a single type is marked as searchable or aggregatable, all the types are searchable or aggregatable
      const isSearchable = types.some((type) => {
        return (
          !!capsByType[type].searchable ||
          (!!capsByType[type].non_searchable_indices &&
            capsByType[type].non_searchable_indices!.length > 0)
        );
      });

      const isAggregatable = types.some((type) => {
        return (
          !!capsByType[type].aggregatable ||
          (!!capsByType[type].non_aggregatable_indices &&
            capsByType[type].non_aggregatable_indices!.length > 0)
        );
      });

      // If there are multiple types but they all resolve to the same kibana type
      // ignore the conflict and carry on (my wayward son)
      const uniqueKibanaTypes = uniq(types.map(castEsToKbnFieldTypeName));
      if (uniqueKibanaTypes.length > 1) {
        const field = {
          name: fieldName,
          type: 'conflict',
          esTypes: types,
          searchable: isSearchable,
          aggregatable: isAggregatable,
          readFromDocValues: false,
          conflictDescriptions: types.reduce(
            (acc, esType) => ({
              ...acc,
              [esType]: capsByType[esType].indices,
            }),
            {}
          ),
          metadata_field: capsByType[types[0]].metadata_field,
        };
        // This is intentionally using a "hash" and a "push" to be highly optimized with very large indexes
        agg.array.push(field);
        agg.hash[fieldName] = field;
        return agg;
      }

      const esType = types[0];
      const field = {
        name: fieldName,
        type: castEsToKbnFieldTypeName(esType),
        esTypes: types,
        searchable: isSearchable,
        aggregatable: isAggregatable,
        readFromDocValues: shouldReadFieldFromDocValues(isAggregatable, esType),
        metadata_field: capsByType[types[0]].metadata_field,
      };
      // This is intentionally using a "hash" and a "push" to be highly optimized with very large indexes
      agg.array.push(field);
      agg.hash[fieldName] = field;
      return agg;
    },
    {
      array: [],
      hash: {},
    }
  );

  // Get all types of sub fields. These could be multi fields or children of nested/object types
  const subFields = kibanaFormattedCaps.array.filter((field) => {
    return field.name.includes('.');
  });

  // Determine the type of each sub field.
  subFields.forEach((field) => {
    const parentFieldNames = field.name
      .split('.')
      .slice(0, -1)
      .map((_, index, parentFieldNameParts) => {
        return parentFieldNameParts.slice(0, index + 1).join('.');
      });
    const parentFieldCaps = parentFieldNames.map(
      (parentFieldName) => kibanaFormattedCaps.hash[parentFieldName]
    );
    const parentFieldCapsAscending = parentFieldCaps.reverse();

    if (parentFieldCaps && parentFieldCaps.length > 0) {
      let subType = {};
      // If the parent field is not an object or nested field the child must be a multi field.
      const firstParent = parentFieldCapsAscending[0];
      if (firstParent && !['object', 'nested'].includes(firstParent.type)) {
        subType = { ...subType, multi: { parent: firstParent.name } };
      }

      // We need to know if any parent field is nested
      const nestedParentCaps = parentFieldCapsAscending.find(
        (parentCaps) => parentCaps && parentCaps.type === 'nested'
      );
      if (nestedParentCaps) {
        subType = { ...subType, nested: { path: nestedParentCaps.name } };
      }

      if (Object.keys(subType).length > 0) {
        field.subType = subType;
      }
    }
  });

  return kibanaFormattedCaps.array.filter((field) => {
    return !['object', 'nested'].includes(field.type);
  });
}
