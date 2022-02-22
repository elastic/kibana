/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createUsageCollectionSetupMock } from '../../plugins/usage_collection/server/mocks';
import { externallyDefinedSchema } from './constants';

const { makeUsageCollector } = createUsageCollectionSetupMock();

interface Usage {
  locale?: string;
}

export const myCollector = makeUsageCollector<Usage>({
  type: 'with_imported_schema',
  isReady: () => true,
  schema: externallyDefinedSchema,
  fetch(): Usage {
    return {
      locale: 'en',
    };
  },
});
