/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Profile } from '../composable_profile';
import { AsyncProfileService } from '../profile_service';

export enum SolutionType {
  Observability = 'oblt',
  Security = 'security',
  Search = 'search',
  Default = 'default',
}

export interface RootProfileProviderParams {
  solutionNavId?: string | null;
}

export interface RootContext {
  solutionType: SolutionType;
}

export type RootProfile = Profile;

export const rootProfileService = new AsyncProfileService<
  RootProfile,
  RootProfileProviderParams,
  RootContext
>();

export type RootProfileProvider = Parameters<typeof rootProfileService.registerProvider>[0];

rootProfileService.registerProvider({
  order: 0,
  profile: {
    getTopNavItems: (prev) => () =>
      [
        {
          id: 'o11y-root-entry',
          label: 'O11y project entry',
          run: () => {
            alert('HELLO WORLD');
          },
        },
        ...prev(),
      ],
  },
  resolve: (params) => {
    if (params.solutionNavId === 'oblt') {
      return {
        isMatch: true,
        context: {
          solutionType: SolutionType.Observability,
        },
      };
    }

    return { isMatch: false };
  },
});
