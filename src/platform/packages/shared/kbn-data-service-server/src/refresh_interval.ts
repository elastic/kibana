/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';

export const refreshIntervalSchema = schema.object(
  {
    pause: schema.boolean({
      meta: {
        description: 'When `true`, auto-refresh is paused.',
      },
    }),
    value: schema.number({
      meta: {
        description: 'The refresh interval in milliseconds.',
      },
    }),
  },
  {
    meta: {
      id: 'kbn-data-service-server-refreshIntervalSchema',
      title: 'Refresh interval',
      description: 'Specifies the auto-refresh interval for the object.',
    },
  }
);
