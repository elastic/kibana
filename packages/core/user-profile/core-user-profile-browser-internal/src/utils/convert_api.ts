/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreUserProfileDelegateContract } from '@kbn/core-user-profile-browser';
import type { InternalUserProfileServiceStart } from '../internal_contracts';

export const convertUserProfileAPI = (
  delegate: CoreUserProfileDelegateContract
): InternalUserProfileServiceStart => {
  return {
    getUserProfile$: () => delegate.userProfile$,
    getCurrent: delegate.getCurrent.bind(delegate),
    bulkGet: delegate.bulkGet.bind(delegate),
    suggest: delegate.suggest.bind(delegate),
    update: delegate.update.bind(delegate),
    partialUpdate: delegate.partialUpdate.bind(delegate),
  };
};
