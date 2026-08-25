/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { CORE_USAGE_STATS_TYPE } from '@kbn/core-usage-data-base-server-internal';
import { migrateTo7141 } from './migrations';

/** @internal */
export const coreUsageStatsType: SavedObjectsType = {
  name: CORE_USAGE_STATS_TYPE,
  hidden: true,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false, // we aren't querying or aggregating over this data, so we don't need to specify any fields
    properties: {},
  },
  migrations: {
    '7.14.1': migrateTo7141,
  },
};
