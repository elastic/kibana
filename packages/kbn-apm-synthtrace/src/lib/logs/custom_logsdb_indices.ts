/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IndicesCreateRequest } from '@elastic/elasticsearch/lib/api/types';

export enum IndexName {
  cloudLogs = 'cloud-logs-synth.1-default',
}

export const indexMappings: {
  [key in IndexName]: IndicesCreateRequest;
} = {
  [IndexName.cloudLogs]: {
    index: IndexName.cloudLogs,
    mappings: {
      properties: {
        '@timestamp': {
          type: 'date',
        },
      },
    },
  },
};
