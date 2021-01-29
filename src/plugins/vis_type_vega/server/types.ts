/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Observable } from 'rxjs';
import { HomeServerPluginSetup } from '../../home/server';
import { UsageCollectionSetup } from '../../usage_collection/server';

export type ConfigObservable = Observable<{ kibana: { index: string } }>;

export interface VegaSavedObjectAttributes {
  title: string;
  type: string;
  params: {
    spec: string;
  };
}

export interface VisTypeVegaPluginSetupDependencies {
  usageCollection?: UsageCollectionSetup;
  home?: HomeServerPluginSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface VisTypeVegaPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface VisTypeVegaPluginStart {}
