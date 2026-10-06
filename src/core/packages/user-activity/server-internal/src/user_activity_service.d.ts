/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type { InternalLoggingServiceSetup } from '@kbn/core-logging-server-internal';
import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import type { InternalUserActivityServiceSetup, InternalUserActivityServiceStart } from './types';
/** @internal */
interface UserActivitySetupDeps {
  logging: InternalLoggingServiceSetup;
}
/** @internal */
interface UserActivityStartDeps {
  typeRegistry: ISavedObjectTypeRegistry;
}
/**
 * Service for recording user actions within Kibana.
 *
 * @internal
 */
export declare class UserActivityService
  implements CoreService<InternalUserActivityServiceSetup, InternalUserActivityServiceStart>
{
  private readonly coreContext;
  private readonly logger;
  private enabled;
  private filters;
  private readonly injectedContextAsyncStorage;
  private savedObjectTypeNames;
  constructor(coreContext: CoreContext);
  setup({ logging }: UserActivitySetupDeps): InternalUserActivityServiceSetup;
  start({ typeRegistry }: UserActivityStartDeps): InternalUserActivityServiceStart;
  stop(): void;
  private trackUserAction;
  private setInjectedContext;
  private getInjectedContext;
}
export {};
