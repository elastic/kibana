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

import { flow, omit } from 'lodash';
import { SavedObjectMigrationFn } from 'kibana/server';

const migrateAttributeTypeAndAttributeTypeMeta: SavedObjectMigrationFn<any, any> = (doc) => ({
  ...doc,
  attributes: {
    ...doc.attributes,
    type: doc.attributes.type || undefined,
    typeMeta: doc.attributes.typeMeta || undefined,
  },
});

const migrateSubTypeAndParentFieldProperties: SavedObjectMigrationFn<any, any> = (doc) => {
  if (!doc.attributes.fields) return doc;

  const fieldsString = doc.attributes.fields;
  const fields = JSON.parse(fieldsString) as any[];
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

export const indexPatternSavedObjectTypeMigrations = {
  '6.5.0': flow(migrateAttributeTypeAndAttributeTypeMeta),
  '7.6.0': flow(migrateSubTypeAndParentFieldProperties),
};
