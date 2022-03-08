/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Usage } from './types';
import { createUsageCollectionSetupMock } from '../../../plugins/usage_collection/server/mocks';

const { makeUsageCollector } = createUsageCollectionSetupMock();

export const myCollector = makeUsageCollector<Usage>({
  type: 'importing_from_export_collector',
  isReady: () => true,
  fetch() {
    return {
      some_field: 'abc',
    };
  },
  schema: {
    some_field: {
      type: 'keyword',
    },
  },
});
