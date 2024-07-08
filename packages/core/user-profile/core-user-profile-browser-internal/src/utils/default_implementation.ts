/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { of } from 'rxjs';
import type {
  CoreUserProfileDelegateContract,
  GetUserProfileResponse,
} from '@kbn/core-user-profile-browser';
import { UserProfileData } from '@kbn/core-user-profile-common';

export const getDefaultUserProfileImplementation = (): CoreUserProfileDelegateContract => {
  return {
    userProfile$: of(null),
    getCurrent: <D extends UserProfileData>() =>
      Promise.resolve(null as unknown as GetUserProfileResponse<D>),
    bulkGet: () => Promise.resolve([]),
    suggest: () => Promise.resolve([]),
    update: () => Promise.resolve(),
    partialUpdate: () => Promise.resolve(),
  };
};
