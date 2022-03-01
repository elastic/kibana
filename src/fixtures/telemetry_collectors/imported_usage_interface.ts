/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Usage } from './constants';
import { createUsageCollectionSetupMock } from '../../plugins/usage_collection/server/mocks';

const { makeUsageCollector } = createUsageCollectionSetupMock();

export const myCollector = makeUsageCollector<Usage>({
  type: 'imported_usage_interface_collector',
  isReady: () => true,
  fetch() {
    return {
      locale: 'en',
    };
  },
  schema: {
    locale: {
      type: 'keyword',
    },
  },
});
