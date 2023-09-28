/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CategorizedFields, FieldDefinition } from '@kbn/management-settings-types';

export const categorizeFields = (fields: FieldDefinition[]): CategorizedFields => {
  // Group settings by category
  return fields.reduce((grouped: CategorizedFields, field) => {
    const category = field.categories[0];
    const group = grouped[category] || { count: 0, fields: [] };
    group.fields = [...group.fields, field];
    group.count = group.fields.length;
    grouped[category] = group;

    return grouped;
  }, {});
};
