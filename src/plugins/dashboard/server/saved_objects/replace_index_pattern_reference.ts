/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectMigrationFn } from 'kibana/server';
import { INDEX_PATTERN_SAVED_OBJECT_TYPE } from '../../../data/common';

export const replaceIndexPatternReference: SavedObjectMigrationFn<any, any> = (doc) => ({
  ...doc,
  references: Array.isArray(doc.references)
    ? doc.references.map((reference) => {
        if (reference.type === 'index_pattern') {
          reference.type = INDEX_PATTERN_SAVED_OBJECT_TYPE;
        }
        return reference;
      })
    : doc.references,
});
