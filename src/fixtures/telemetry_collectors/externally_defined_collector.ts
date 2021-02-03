/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  CollectorSet,
  UsageCollectorOptions,
} from '../../plugins/usage_collection/server/collector';
import { loggerMock } from '../../core/server/logging/logger.mock';

const collectorSet = new CollectorSet({
  logger: loggerMock.create(),
  maximumWaitTimeForAllCollectorsInS: 0,
});

interface Usage {
  locale: string;
}

function createCollector(): UsageCollectorOptions<Usage> {
  return {
    type: 'from_fn_collector',
    isReady: () => true,
    fetch(): Usage {
      return {
        locale: 'en',
      };
    },
    schema: {
      locale: {
        type: 'keyword',
      },
    },
  };
}

export function defineCollectorFromVariable() {
  const fromVarCollector: UsageCollectorOptions<Usage> = {
    type: 'from_variable_collector',
    isReady: () => true,
    fetch(): Usage {
      return {
        locale: 'en',
      };
    },
    schema: {
      locale: {
        type: 'keyword',
      },
    },
  };

  collectorSet.makeUsageCollector<Usage>(fromVarCollector);
}

export function defineCollectorFromFn() {
  const fromFnCollector = createCollector();

  collectorSet.makeUsageCollector<Usage>(fromFnCollector);
}
