/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SavedObjectsType } from '../saved_objects';
import { CORE_USAGE_STATS_TYPE } from './constants';

/** @internal */
export const coreUsageStatsType: SavedObjectsType = {
  name: CORE_USAGE_STATS_TYPE,
  hidden: true,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false, // we aren't querying or aggregating over this data, so we don't need to specify any fields
    properties: {},
  },
};
