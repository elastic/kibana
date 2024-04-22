/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FieldDefinition } from '@kbn/management-settings-types';
import type { CategoryCounts } from '@kbn/management-settings-types/category';
import { categorizeFields } from './categorize_fields';

/**
 * Utility function to extract the number of fields in each settings category.
 * @param fields A list of {@link FieldDefinition} objects.
 * @returns A {@link CategoryCounts} object.
 */
export const getCategoryCounts = (fields: FieldDefinition[]): CategoryCounts => {
  const categorizedFields = categorizeFields(fields);
  const categoryCounts: CategoryCounts = {};
  Object.entries(categorizedFields).forEach(
    ([category, value]) => (categoryCounts[category] = value.count)
  );
  return categoryCounts;
};
