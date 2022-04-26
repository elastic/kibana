/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { forOwn } from 'lodash';
import { extractSearchSourceReferences } from '@kbn/data-plugin/public';
import { SavedObject, SavedObjectConfig } from '../../types';
import { expandShorthand } from './field_mapping';

export function serializeSavedObject(savedObject: SavedObject, config: SavedObjectConfig) {
  // mapping definition for the fields that this object will expose
  const mapping = expandShorthand(config.mapping ?? {});
  const attributes = {} as Record<string, any>;
  const references = [];

  forOwn(mapping, (fieldMapping, fieldName) => {
    if (typeof fieldName !== 'string') {
      return;
    }
    // @ts-ignore
    const savedObjectFieldVal = savedObject[fieldName];
    if (savedObjectFieldVal != null) {
      attributes[fieldName] = fieldMapping._serialize
        ? fieldMapping._serialize(savedObjectFieldVal)
        : savedObjectFieldVal;
    }
  });

  if (savedObject.searchSource) {
    const { searchSourceJSON, references: searchSourceReferences } =
      savedObject.searchSource.serialize();
    attributes.kibanaSavedObjectMeta = { searchSourceJSON };
    references.push(...searchSourceReferences);
  }

  if (savedObject.searchSourceFields) {
    const [searchSourceFields, searchSourceReferences] = extractSearchSourceReferences(
      savedObject.searchSourceFields
    );
    const searchSourceJSON = JSON.stringify(searchSourceFields);
    attributes.kibanaSavedObjectMeta = { searchSourceJSON };
    references.push(...searchSourceReferences);
  }

  if (savedObject.unresolvedIndexPatternReference) {
    references.push(savedObject.unresolvedIndexPatternReference);
  }

  return { attributes, references };
}
