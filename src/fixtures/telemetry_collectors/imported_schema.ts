/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CollectorSet } from '../../plugins/usage_collection/server/collector';
import { loggerMock } from '../../core/server/logging/logger.mock';
import { externallyDefinedSchema } from './constants';

const { makeUsageCollector } = new CollectorSet({
  logger: loggerMock.create(),
  maximumWaitTimeForAllCollectorsInS: 0,
});

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
