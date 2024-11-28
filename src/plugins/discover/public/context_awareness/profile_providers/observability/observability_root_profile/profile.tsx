/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RootProfileProvider, SolutionType } from '../../../profiles';
import { ProfileProviderServices } from '../../profile_provider_services';
import { OBSERVABILITY_ROOT_PROFILE_ID } from '../consts';
import { createGetAppMenu } from './accessors';

export const createObservabilityRootProfileProvider = (
  services: ProfileProviderServices
): RootProfileProvider => ({
  profileId: OBSERVABILITY_ROOT_PROFILE_ID,
  profile: {
    getAppMenu: createGetAppMenu(services),
  },
  resolve: (params) => {
    if (params.solutionNavId === SolutionType.Observability) {
      return { isMatch: true, context: { solutionType: SolutionType.Observability } };
    }

    return { isMatch: false };
  },
});
