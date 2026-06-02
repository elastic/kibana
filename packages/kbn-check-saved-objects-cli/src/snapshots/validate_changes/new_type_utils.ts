/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import type { MigrationInfoRecord } from '../../types';
import { RULE_IDS, SavedObjectsCheckError } from '../../findings';
import {
  getFieldsMissingIgnoreAbove,
  getInvalidNameTitleFields,
  isSearchableViaManagement,
} from './common_utils';

/**
 * Validates that all `keyword` and `flattened` mapping fields on a **new** SO type define
 * `ignore_above`. Without this constraint, Elasticsearch silently drops strings that exceed
 * the default length limit during indexing, which can cause hard-to-diagnose data loss.
 *
 * Throws if any field is missing `ignore_above`.
 */
export function validateIgnoreAboveNewType(name: string, to: MigrationInfoRecord): void {
  const fieldsMissing = getFieldsMissingIgnoreAbove(to.mappings);
  if (fieldsMissing.length > 0) {
    throw new SavedObjectsCheckError({
      ruleId: RULE_IDS.NEW_TYPE_KEYWORD_MISSING_IGNORE_ABOVE,
      severity: 'error',
      typeName: name,
      message: `The SO type '${name}' has 'keyword' or 'flattened' mapping fields without 'ignore_above': ${fieldsMissing.join(
        ', '
      )}.`,
      fixHint: `Add 'ignore_above: 1024' (or another appropriate limit) to each affected field to prevent Elasticsearch from silently dropping strings that exceed the limit.`,
      docsAnchor: '#defining-model-versions',
    });
  }
}

/**
 * Validates that `name` and `title` mapping fields use `type: text` on a **new** SO type being
 * introduced. Types that are not searchable via the management page are exempt.
 *
 * Throws if an incorrect field type is found.
 */
export function validateNameTitleFieldTypesNewType(
  name: string,
  to: MigrationInfoRecord,
  registeredType: SavedObjectsType
): void {
  if (!isSearchableViaManagement(registeredType)) {
    return;
  }

  const invalidFields = getInvalidNameTitleFields(to);
  if (invalidFields.length > 0) {
    throw new SavedObjectsCheckError({
      ruleId: RULE_IDS.NEW_TYPE_INVALID_NAME_TITLE_FIELD_TYPE,
      severity: 'error',
      typeName: name,
      message: `The SO type '${name}' has 'name' or 'title' fields with incorrect types: ${invalidFields
        .map(({ description }) => description)
        .join(', ')}.`,
      fixHint: `These fields must be of type 'text' for Search API compatibility.`,
      docsAnchor: '#defining-model-versions',
    });
  }
}
