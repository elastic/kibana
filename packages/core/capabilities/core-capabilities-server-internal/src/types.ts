/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CapabilitiesSwitcher } from '@kbn/core-capabilities-server';

export interface SwitcherWithOptions {
  switcher: CapabilitiesSwitcher;
  capabilityPath: string[];
}

export interface SwitcherWithId extends SwitcherWithOptions {
  id: string;
}

export interface SwitcherBucket {
  switchers: SwitcherWithId[];
  bucketPaths: Set<string>;
}
