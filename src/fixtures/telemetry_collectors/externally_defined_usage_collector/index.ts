/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { getUsageCollector } from './get_usage_collector';

export function registerCollector(collectorSet: UsageCollectionSetup) {
  const collectorName = 'some_configs';
  const collector = collectorSet.makeUsageCollector(getUsageCollector(collectorName));

  collectorSet.registerCollector(collector);
}
