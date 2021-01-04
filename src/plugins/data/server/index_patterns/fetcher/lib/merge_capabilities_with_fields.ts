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

// Merge rollup capabilities information with field information

import { FieldDescriptor } from '../index_patterns_fetcher';

export const mergeCapabilitiesWithFields = (
  rollupIndexCapabilities: { [key: string]: any },
  fieldsFromFieldCapsApi: { [key: string]: any },
  previousFields: FieldDescriptor[] = []
) => {
  const rollupFields = [...previousFields];
  const rollupFieldNames: string[] = [];

  Object.keys(rollupIndexCapabilities).forEach((agg) => {
    // Field names of the aggregation
    const fields = Object.keys(rollupIndexCapabilities[agg]);

    // Default field information
    const defaultField = {
      name: null,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    };

    // Date histogram agg only ever has one field defined, let date type overwrite a
    // previous type if defined (such as number from max and min aggs).
    if (agg === 'date_histogram') {
      const timeFieldName = fields[0];
      const fieldCapsKey = `${timeFieldName}.${agg}.timestamp`;
      const newField = {
        ...fieldsFromFieldCapsApi[fieldCapsKey],
        ...defaultField,
        name: timeFieldName,
      };
      const existingField = rollupFields.find((field) => field.name === timeFieldName);

      if (existingField) {
        Object.assign(existingField, newField);
      } else {
        rollupFieldNames.push(timeFieldName);
        rollupFields.push(newField);
      }
    }
    // For all other aggs, filter out ones that have already been added to the field list
    // because the same field can be part of multiple aggregations, but end consumption
    // doesn't differentiate fields based on their aggregation abilities.
    else {
      rollupFields.push(
        ...fields
          .filter((field) => !rollupFieldNames.includes(field))
          .map((field) => {
            // Expand each field into object format that end consumption expects.
            const fieldCapsKey = `${field}.${agg}.value`;
            rollupFieldNames.push(field);
            return {
              ...fieldsFromFieldCapsApi[fieldCapsKey],
              ...defaultField,
              name: field,
            };
          })
      );
    }
  });

  return rollupFields;
};
