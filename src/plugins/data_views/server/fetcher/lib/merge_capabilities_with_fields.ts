/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Merge rollup capabilities information with field information

import { FieldDescriptor } from '../index_patterns_fetcher';

export const mergeCapabilitiesWithFields = (
  rollupIndexCapabilities: Record<string, {}>,
  fieldsFromFieldCapsApi: Record<string, FieldDescriptor>,
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
          .reduce<FieldDescriptor[]>((collector, field) => {
            // Expand each field into object format that end consumption expects.
            const fieldCapsKey = `${field}.${agg}.value`;
            rollupFieldNames.push(field);

            // only add fields if they are returned from field caps. they won't exist if there's no data
            if (fieldsFromFieldCapsApi[fieldCapsKey]) {
              collector.push({
                ...fieldsFromFieldCapsApi[fieldCapsKey],
                ...defaultField,
                name: field,
              });
            }
            return collector;
          }, [])
      );
    }
  });

  return rollupFields;
};
