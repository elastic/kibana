/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloneDeep } from 'lodash';
import type { SavedObjectUnsanitizedDoc } from '../saved_objects';
import type { CoreUsageStats } from './types';

export const migrateTo7141 = (doc: SavedObjectUnsanitizedDoc<CoreUsageStats>) => {
  try {
    return resetFields(doc, [
      // Prior to this, we were counting the `overwrite` option incorrectly; reset all import API counter fields so we get clean data
      'apiCalls.savedObjectsImport.total',
      'apiCalls.savedObjectsImport.namespace.default.total',
      'apiCalls.savedObjectsImport.namespace.default.kibanaRequest.yes',
      'apiCalls.savedObjectsImport.namespace.default.kibanaRequest.no',
      'apiCalls.savedObjectsImport.namespace.custom.total',
      'apiCalls.savedObjectsImport.namespace.custom.kibanaRequest.yes',
      'apiCalls.savedObjectsImport.namespace.custom.kibanaRequest.no',
      'apiCalls.savedObjectsImport.createNewCopiesEnabled.yes',
      'apiCalls.savedObjectsImport.createNewCopiesEnabled.no',
      'apiCalls.savedObjectsImport.overwriteEnabled.yes',
      'apiCalls.savedObjectsImport.overwriteEnabled.no',
    ]);
  } catch (err) {
    // fail-safe
  }
  return doc;
};

function resetFields(
  doc: SavedObjectUnsanitizedDoc<CoreUsageStats>,
  fieldsToReset: Array<keyof CoreUsageStats>
) {
  const newDoc = cloneDeep(doc);
  const { attributes = {} } = newDoc;
  for (const field of fieldsToReset) {
    attributes[field] = 0;
  }
  return { ...newDoc, attributes };
}
