/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SolutionType } from '../../../profiles';
import type { ProfileProviderServices } from '../../profile_provider_services';
import { OBSERVABILITY_ROOT_PROFILE_ID } from '../consts';
import { createGetAppMenu, getDefaultAdHocDataViews } from './accessors';
import type { ObservabilityRootProfileProvider } from './types';

export const createObservabilityRootProfileProvider = (
  services: ProfileProviderServices
): ObservabilityRootProfileProvider => ({
  profileId: OBSERVABILITY_ROOT_PROFILE_ID,
  profile: {
    getAppMenu: createGetAppMenu(services),
    getDefaultAdHocDataViews,
  },
  resolve: (params) => {
    if (params.solutionNavId !== SolutionType.Observability) {
      return { isMatch: false };
    }

    return {
      isMatch: true,
      context: {
        solutionType: SolutionType.Observability,
        allLogsIndexPattern: services.logsContextService.getAllLogsIndexPattern(),
      },
    };
  },
});
