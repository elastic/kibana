/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { flow, omit } from 'lodash';
import { SavedObjectMigrationFn } from '@kbn/core/server';

const migrateAttributeTypeAndAttributeTypeMeta: SavedObjectMigrationFn<
  { type?: string; typeMeta?: string },
  unknown
> = (doc) => ({
  ...doc,
  attributes: {
    ...doc.attributes,
    type: doc.attributes.type || undefined,
    typeMeta: doc.attributes.typeMeta || undefined,
  },
});

const migrateSubTypeAndParentFieldProperties: SavedObjectMigrationFn<
  { fields?: string },
  unknown
> = (doc) => {
  if (!doc.attributes.fields) return doc;

  const fieldsString = doc.attributes.fields;
  const fields = JSON.parse(fieldsString) as Array<{ subType?: string; parent?: string }>;
  const migratedFields = fields.map((field) => {
    if (field.subType === 'multi') {
      return {
        ...omit(field, 'parent'),
        subType: { multi: { parent: field.parent } },
      };
    }

    return field;
  });

  return {
    ...doc,
    attributes: {
      ...doc.attributes,
      fields: JSON.stringify(migratedFields),
    },
  };
};

const addAllowNoIndex: SavedObjectMigrationFn<{}, unknown> = (doc) => ({
  ...doc,
  attributes: {
    ...doc.attributes,
    allowNoIndex: doc.id === 'logs-*' || doc.id === 'metrics-*' || undefined,
  },
});

export const indexPatternSavedObjectTypeMigrations = {
  '6.5.0': flow(migrateAttributeTypeAndAttributeTypeMeta),
  '7.6.0': flow(migrateSubTypeAndParentFieldProperties),
  '7.11.0': flow(addAllowNoIndex),
};
