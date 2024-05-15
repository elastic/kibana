/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ComposableProfile, PartialProfile, Profile } from './composable_profile';

export interface ProfileProvider<TProfile extends PartialProfile, TParams, TContext> {
  order: number;
  profile: ComposableProfile<TProfile>;
  resolve: (params: TParams) => { isMatch: true; context: TContext } | { isMatch: false };
}

const EMPTY_PROFILE = {};

export class ProfileService<TProfile extends PartialProfile, TParams, TContext> {
  private readonly providers: Array<ProfileProvider<TProfile, TParams, TContext>> = [];

  public registerProvider(provider: ProfileProvider<TProfile, TParams, TContext>) {
    this.providers.push(provider);
    this.providers.sort((a, b) => a.order - b.order);
  }

  public resolve(params: TParams): ComposableProfile<Profile> {
    for (const provider of this.providers) {
      const result = provider.resolve(params);

      if (result.isMatch) {
        return provider.profile as ComposableProfile<Profile>;
      }
    }

    return EMPTY_PROFILE;
  }
}
