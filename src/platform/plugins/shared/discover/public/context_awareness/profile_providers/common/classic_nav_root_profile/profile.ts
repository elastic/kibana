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
import { getDefaultAdHocDataViews } from './accessors';
import type { ClassicNavRootProfileProvider } from './types';

export const createClassicNavRootProfileProvider = (
  services: ProfileProviderServices
): ClassicNavRootProfileProvider => ({
  profileId: 'classic-nav-root-profile',
  profile: { getDefaultAdHocDataViews },
  resolve: (params) => {
    if (typeof params.solutionNavId === 'string') {
      return { isMatch: false };
    }

    return {
      isMatch: true,
      context: {
        solutionType: SolutionType.Default,
        allLogsIndexPattern: services.logsContextService.getAllLogsIndexPattern(),
      },
    };
  },
});
