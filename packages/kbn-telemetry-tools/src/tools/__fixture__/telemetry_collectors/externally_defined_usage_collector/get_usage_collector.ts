/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface Usage {
  collectorName: string;
}

export function getUsageCollector(collectorName: string) {
  return {
    type: 'externally_defined_usage_collector',
    isReady: () => true,
    schema: {
      collectorName: {
        type: 'keyword' as 'keyword',
      },
    },
    fetch(): Usage {
      return {
        collectorName,
      };
    },
  };
}
