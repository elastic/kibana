/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type {
  InternalUserProfileServiceSetup,
  InternalUserProfileServiceStart,
} from './internal_contracts';
export declare class UserProfileService
  implements CoreService<InternalUserProfileServiceSetup, InternalUserProfileServiceStart>
{
  private readonly log;
  private delegate?;
  constructor(coreContext: CoreContext);
  setup(): InternalUserProfileServiceSetup;
  start(): InternalUserProfileServiceStart;
  stop(): void;
}
