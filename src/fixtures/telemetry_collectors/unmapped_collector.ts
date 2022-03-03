/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createUsageCollectionSetupMock } from '../../plugins/usage_collection/server/mocks';

const { makeUsageCollector } = createUsageCollectionSetupMock();

interface Usage {
  locale: string;
}

// @ts-expect-error Intentionally not specifying `schema`
export const myCollector = makeUsageCollector<Usage>({
  type: 'unmapped_collector',
  isReady: () => true,
  fetch(): Usage {
    return {
      locale: 'en',
    };
  },
});
