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

import { uniq } from 'lodash';
import { castEsToKbnFieldTypeName } from '../../../../../common';
import { shouldReadFieldFromDocValues } from './should_read_field_from_doc_values';
import { FieldDescriptor } from '../../../fetcher';

interface FieldCapObject {
  type: string;
  searchable: boolean;
  aggregatable: boolean;
  indices?: string[];
  non_searchable_indices?: string[];
  non_aggregatable_indices?: string[];
}

export interface FieldCapsResponse {
  fields: Record<string, Record<string, FieldCapObject>>;
}

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
export function readFieldCapsResponse(fieldCapsResponse: FieldCapsResponse): FieldDescriptor[] {
  const capsByNameThenType = fieldCapsResponse.fields;
  const kibanaFormattedCaps: FieldDescriptor[] = Object.keys(capsByNameThenType).map(fieldName => {
    const capsByType = capsByNameThenType[fieldName];
    const types = Object.keys(capsByType);

    // If a single type is marked as searchable or aggregatable, all the types are searchable or aggregatable
    const isSearchable = types.some(type => {
      return (
        !!capsByType[type].searchable ||
        (!!capsByType[type].non_searchable_indices &&
          capsByType[type].non_searchable_indices!.length > 0)
      );
    });

    const isAggregatable = types.some(type => {
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
      return {
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
      };
    }

    const esType = types[0];
    return {
      name: fieldName,
      type: castEsToKbnFieldTypeName(esType),
      esTypes: types,
      searchable: isSearchable,
      aggregatable: isAggregatable,
      readFromDocValues: shouldReadFieldFromDocValues(isAggregatable, esType),
    };
  });

  // Get all types of sub fields. These could be multi fields or children of nested/object types
  const subFields = kibanaFormattedCaps.filter(field => {
    return field.name.includes('.');
  });

  // Determine the type of each sub field.
  subFields.forEach(field => {
    const parentFieldNames = field.name
      .split('.')
      .slice(0, -1)
      .map((_, index, parentFieldNameParts) => {
        return parentFieldNameParts.slice(0, index + 1).join('.');
      });
    const parentFieldCaps = parentFieldNames.map(parentFieldName => {
      return kibanaFormattedCaps.find(caps => caps.name === parentFieldName);
    });
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
        parentCaps => parentCaps && parentCaps.type === 'nested'
      );
      if (nestedParentCaps) {
        subType = { ...subType, nested: { path: nestedParentCaps.name } };
      }

      if (Object.keys(subType).length > 0) {
        field.subType = subType;

        // We don't support aggregating on nested fields, trying to do so in the UI will return
        // blank results. For now we will stop showing nested fields as an option for aggregation.
        // Once we add support for nested fields this condition should be removed and old index
        // patterns should be migrated.
        if (field.subType.nested) {
          field.aggregatable = false;
        }
      }
    }
  });

  return kibanaFormattedCaps.filter(field => {
    return !['object', 'nested'].includes(field.type);
  });
}
