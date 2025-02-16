/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EcsMetadata } from '@kbn/alerts-as-data-utils/src/field_maps/types';
import {
  ALERT_CASE_IDS,
  ALERT_MAINTENANCE_WINDOW_IDS,
  DefaultAlertFieldName,
} from '@kbn/rule-data-utils';
import type { BrowserField, BrowserFields } from '@kbn/rule-registry-plugin/common';
import { isEmpty } from 'lodash/fp';
import { CASES, MAINTENANCE_WINDOWS } from './translations';

export const FIELD_BROWSER_WIDTH = 925;
export const TABLE_HEIGHT = 260;

/** Returns true if the specified category has at least one field */
export const categoryHasFields = (category: Partial<BrowserField>): boolean =>
  category.fields != null && Object.keys(category.fields).length > 0;

/** Returns the count of fields in the specified category */
export const getFieldCount = (category: Partial<BrowserField> | undefined): number =>
  category != null && category.fields != null ? Object.keys(category.fields).length : 0;

const matchesSystemField = (field: string, searchTerm: string): boolean => {
  const termsToMatch = [
    CASES.toLocaleLowerCase(),
    MAINTENANCE_WINDOWS.toLocaleLowerCase(),
    'cases',
    'maintenance windows',
  ];

  const fieldsToMatch: DefaultAlertFieldName[] = [ALERT_CASE_IDS, ALERT_MAINTENANCE_WINDOW_IDS];

  const term = searchTerm.toLocaleLowerCase();

  const matchesField = fieldsToMatch.includes(field as DefaultAlertFieldName);
  const matchesTerm = termsToMatch.some((termToMatch) => termToMatch.includes(term));

  return matchesField && matchesTerm;
};

/**
 * Filters the specified `BrowserFields` to return a new collection where every
 * category contains at least one field name that matches the specified substring.
 */
export function filterBrowserFieldsByFieldName({
  browserFields,
  substring,
}: {
  browserFields: BrowserFields;
  substring: string;
}): BrowserFields {
  const trimmedSubstring = substring.trim();
  // an empty search param will match everything, so return the original browserFields
  if (trimmedSubstring === '') {
    return browserFields;
  }
  const result: Record<string, Partial<BrowserField>> = {};
  for (const [categoryName, categoryDescriptor] of Object.entries(browserFields)) {
    if (!categoryDescriptor.fields) {
      // ignore any category that is missing fields. This is not expected to happen.
      continue;
    }

    // keep track of whether this category had a matching field, if so, we should emit it into the result
    let hadAMatch = false;

    // The fields that matched, for this `categoryName`
    const filteredFields: Record<string, Partial<BrowserField>> = {};

    for (const [fieldName, fieldDescriptor] of Object.entries(categoryDescriptor.fields)) {
      // For historical reasons, we consider the name as it appears on the field descriptor, not the `fieldName` (attribute name) itself.
      // It is unclear if there is any point in continuing to do this.
      const fieldNameFromDescriptor = fieldDescriptor.name;

      if (!fieldNameFromDescriptor) {
        // Ignore any field that is missing a name in its descriptor. This is not expected to happen.
        continue;
      }

      // Check if this field matches (via substring comparison) the passed substring
      if (
        fieldNameFromDescriptor !== null &&
        (fieldNameFromDescriptor.includes(trimmedSubstring) ||
          matchesSystemField(fieldNameFromDescriptor, trimmedSubstring))
      ) {
        // this field is a match, so we should emit this category into the result object.
        hadAMatch = true;

        // emit this field
        filteredFields[fieldName] = fieldDescriptor;
      }
    }

    if (hadAMatch) {
      // if at least one field matches, emit the category, but replace the `fields` attribute with the filtered fields
      result[categoryName] = {
        ...browserFields[categoryName],
        fields: filteredFields,
      };
    }
  }
  return result;
}

/**
 * Filters the selected `BrowserFields` to return a new collection where every
 * category contains at least one field that is present in the `columnIds`.
 */
export const filterSelectedBrowserFields = ({
  browserFields,
  columnIds,
}: {
  browserFields: BrowserFields;
  columnIds: string[];
}): BrowserFields => {
  const selectedFieldIds = new Set(columnIds);

  const result: Record<string, Partial<BrowserField>> = {};

  for (const [categoryName, categoryDescriptor] of Object.entries(browserFields)) {
    if (!categoryDescriptor.fields) {
      // ignore any category that is missing fields. This is not expected to happen.
      continue;
    }

    // keep track of whether this category had a selected field, if so, we should emit it into the result
    let hadSelected = false;

    // The selected fields for this `categoryName`
    const selectedFields: Record<string, Partial<BrowserField>> = {};

    for (const [fieldName, fieldDescriptor] of Object.entries(categoryDescriptor.fields)) {
      // For historical reasons, we consider the name as it appears on the field descriptor, not the `fieldName` (attribute name) itself.
      // It is unclear if there is any point in continuing to do this.
      const fieldNameFromDescriptor = fieldDescriptor.name;

      if (!fieldNameFromDescriptor) {
        // Ignore any field that is missing a name in its descriptor. This is not expected to happen.
        continue;
      }

      if (selectedFieldIds.has(fieldNameFromDescriptor)) {
        hadSelected = true;
        selectedFields[fieldName] = fieldDescriptor;
      }
    }

    if (hadSelected) {
      result[categoryName] = {
        ...browserFields[categoryName],
        fields: selectedFields,
      };
    }
  }
  return result;
};

export const getIconFromType = (type: string | null | undefined) => {
  switch (type) {
    case 'string': // fall through
    case 'keyword':
      return 'string';
    case 'number': // fall through
    case 'long':
      return 'number';
    case 'date':
      return 'clock';
    case 'ip':
    case 'geo_point':
      return 'globe';
    case 'object':
      return 'questionInCircle';
    case 'float':
      return 'number';
    default:
      return 'questionInCircle';
  }
};

export const getEmptyValue = () => '—';

export const getCategory = (fieldName: string) => {
  const fieldNameArray = fieldName?.split('.');
  if (fieldNameArray?.length === 1) {
    return 'base';
  }
  return fieldNameArray?.[0] ?? '(unknown)';
};

export const getDescription = (fieldName: string, ecsFlat: Record<string, EcsMetadata>) =>
  ecsFlat[fieldName]?.description ?? '';

/** Returns example text, or an empty string if the field does not have an example */
export const getExampleText = (example: string | number | null | undefined): string =>
  !isEmpty(example) ? `Example: ${example}` : '';

/** Returns `true` if the escape key was pressed */
export const isEscape = (event: React.KeyboardEvent): boolean => event.key === 'Escape';

export const CATEGORY_TABLE_CLASS_NAME = 'category-table';
export const CLOSE_BUTTON_CLASS_NAME = 'close-button';
export const RESET_FIELDS_CLASS_NAME = 'reset-fields';
