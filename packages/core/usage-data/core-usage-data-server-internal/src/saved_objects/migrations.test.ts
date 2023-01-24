/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import type { CoreUsageStats } from '@kbn/core-usage-data-server';
import { migrateTo7141 } from './migrations';

const type = 'obj-type';
const id = 'obj-id';

describe('#migrateTo7141', () => {
  it('Resets targeted counter fields and leaves others unchanged', () => {
    const doc = {
      type,
      id,
      attributes: {
        foo: 'bar',
        'apiCalls.savedObjectsImport.total': 10,
      },
    } as SavedObjectUnsanitizedDoc<CoreUsageStats>;

    expect(migrateTo7141(doc)).toEqual({
      type,
      id,
      attributes: {
        foo: 'bar',
        'apiCalls.savedObjectsImport.total': 0,
        'apiCalls.savedObjectsImport.namespace.default.total': 0,
        'apiCalls.savedObjectsImport.namespace.default.kibanaRequest.yes': 0,
        'apiCalls.savedObjectsImport.namespace.default.kibanaRequest.no': 0,
        'apiCalls.savedObjectsImport.namespace.custom.total': 0,
        'apiCalls.savedObjectsImport.namespace.custom.kibanaRequest.yes': 0,
        'apiCalls.savedObjectsImport.namespace.custom.kibanaRequest.no': 0,
        'apiCalls.savedObjectsImport.createNewCopiesEnabled.yes': 0,
        'apiCalls.savedObjectsImport.createNewCopiesEnabled.no': 0,
        'apiCalls.savedObjectsImport.overwriteEnabled.yes': 0,
        'apiCalls.savedObjectsImport.overwriteEnabled.no': 0,
      },
    });
  });
});
