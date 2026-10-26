/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RootProfileProvider } from '../../../profiles';
import { SolutionType } from '../../../profiles';
import type { SecurityProfileProviderFactory } from '../types';
import { SECURITY_PROFILE_ID } from '../constants';

export const createSecurityRootProfileProvider: SecurityProfileProviderFactory<
  RootProfileProvider
> = () => ({
  profileId: SECURITY_PROFILE_ID.root,
  profile: {},
  resolve: (params) => {
    if (params.solutionNavId !== SolutionType.Security) {
      return { isMatch: false };
    }

    return {
      isMatch: true,
      context: {
        solutionType: SolutionType.Security,
      },
    };
  },
});
