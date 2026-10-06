/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreContext } from '@kbn/core-base-server-internal';
import type {
  InternalHttpServicePreboot,
  InternalHttpServiceSetup,
} from '@kbn/core-http-server-internal';
import type { CapabilitiesStart, CapabilitiesSetup } from '@kbn/core-capabilities-server';
interface PrebootSetupDeps {
  http: InternalHttpServicePreboot;
}
interface SetupDeps {
  http: InternalHttpServiceSetup;
}
/** @internal */
export declare class CapabilitiesService {
  private readonly logger;
  private readonly capabilitiesProviders;
  private readonly capabilitiesSwitchers;
  private readonly resolveCapabilities;
  private started;
  constructor(core: CoreContext);
  preboot(prebootDeps: PrebootSetupDeps): void;
  setup(setupDeps: SetupDeps): CapabilitiesSetup;
  start(): CapabilitiesStart;
}
export {};
