/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { CollectorSet } from '../../plugins/usage_collection/server/collector';
import { loggerMock } from '../../core/server/logging/logger.mock';
import { Usage } from './constants';

const { makeUsageCollector } = new CollectorSet({
  logger: loggerMock.create(),
  maximumWaitTimeForAllCollectorsInS: 0,
});

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
