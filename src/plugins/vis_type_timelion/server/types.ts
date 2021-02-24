/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';
import { SharedGlobalConfig } from 'kibana/server';
import { UsageCollectionSetup } from '../../usage_collection/server';

export { TimelionFunctionInterface, TimelionFunctionConfig } from './lib/classes/timelion_function';

export type ConfigObservable = Observable<SharedGlobalConfig>;

export interface VisTypeTimelionPluginSetupDependencies {
  usageCollection?: UsageCollectionSetup;
}
