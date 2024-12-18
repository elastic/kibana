/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { CoreContext, CoreService } from '@kbn/core-base-browser-internal';
import type { CoreUserProfileDelegateContract } from '@kbn/core-user-profile-browser';
import type {
  InternalUserProfileServiceSetup,
  InternalUserProfileServiceStart,
} from './internal_contracts';
import { getDefaultUserProfileImplementation, convertUserProfileAPI } from './utils';

export class UserProfileService
  implements CoreService<InternalUserProfileServiceSetup, InternalUserProfileServiceStart>
{
  private readonly log: Logger;
  private delegate?: CoreUserProfileDelegateContract;

  constructor(coreContext: CoreContext) {
    this.log = coreContext.logger.get('user-profile-service');
  }

  public setup(): InternalUserProfileServiceSetup {
    return {
      registerUserProfileDelegate: (delegate) => {
        if (this.delegate) {
          throw new Error('userProfile API can only be registered once');
        }
        this.delegate = delegate;
      },
    };
  }

  public start(): InternalUserProfileServiceStart {
    if (!this.delegate) {
      this.log.warn('userProfile API was not registered, using default implementation');
    }
    const apiContract = this.delegate ?? getDefaultUserProfileImplementation();
    return convertUserProfileAPI(apiContract);
  }

  public stop() {}
}
