/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { ES_FIELD_TYPES } from '@kbn/field-types';

const FIELD_PRIORITY = ['message', 'error.message', 'event.original'];

const METADATA_FIELDS = [
  '_version',
  '_id',
  '_index',
  '_source',
  '_ignored',
  '_index_mode',
  '_score',
];

/**
 * This function returns the categorization field from the list of fields.
 * It checks for the presence of 'message', 'error.message', or 'event.original' in that order.
 * If none of these fields are present, it returns the first field from the list,
 * Assumes text fields have been passed in the `fields` array.
 *
 * @param fields, the list of fields to check
 * @returns string | undefined, the categorization field if found, otherwise undefined
 */
export function getCategorizationField(fields: string[]): string | undefined {
  const fieldSet = new Set(fields);
  for (const field of FIELD_PRIORITY) {
    if (fieldSet.has(field)) {
      return field;
    }
  }

  // Filter out metadata fields
  const filteredFields = fields.filter((field) => !METADATA_FIELDS.includes(field));
  return filteredFields[0] ?? undefined;
}

/**
 * This function returns the categorization field from the DataView.
 * It checks for the presence of 'message', 'error.message', or 'event.original' in that order.
 * If none of these fields are present, it returns the first text field from the DataView.
 *
 * @param dataView, the DataView to check
 * @returns an object containing the message field DataViewField and dataViewFields
 */
export function getCategorizationDataViewField(dataView: DataView): {
  messageField: DataViewField | null;
  dataViewFields: DataViewField[];
} {
  const dataViewFields = dataView.fields.filter((f) => f.esTypes?.includes(ES_FIELD_TYPES.TEXT));
  const categorizationFieldName = getCategorizationField(dataViewFields.map((f) => f.name));
  if (categorizationFieldName) {
    return {
      messageField: dataView.fields.getByName(categorizationFieldName) ?? null,
      dataViewFields,
    };
  }

  return {
    messageField: null,
    dataViewFields,
  };
}
