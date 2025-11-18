/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataStreamDefinition } from './types';

/**
 * Do not change these defaults lightly... They applied to all data streams and may
 * result in a large number of updated data streams when this code is released.
 */
export const defaultDataStreamDefinition: () => Partial<DataStreamDefinition<any, any>> = () => ({
  hidden: true,
  template: {
    priority: 100,
    _meta: {
      managed: true,
      userAgent: '@kbn/data-streams',
    },
    mappings: {
      dynamic: false,
    },
    settings: {
      hidden: true,
    },
  },
});
