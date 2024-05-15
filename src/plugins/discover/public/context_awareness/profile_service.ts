/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ComposableProfile, PartialProfile } from './composable_profile';

export interface ProfileProvider<TProfile extends PartialProfile, TParams, TContext> {
  order: number;
  profile: ComposableProfile<TProfile>;
  resolve: (params: TParams) => { isMatch: true; context: TContext } | { isMatch: false };
}

export class ProfileService<TProfile extends PartialProfile, TParams, TContext> {
  private static readonly EMPTY_PROFILE = {};
  private readonly providers: Array<ProfileProvider<TProfile, TParams, TContext>> = [];

  public registerProvider(provider: ProfileProvider<TProfile, TParams, TContext>) {
    this.providers.push(provider);
    this.providers.sort((a, b) => a.order - b.order);
  }

  public resolve(params: TParams): ComposableProfile<TProfile> {
    for (const provider of this.providers) {
      const result = provider.resolve(params);

      if (result.isMatch) {
        return provider.profile;
      }
    }

    return ProfileService.EMPTY_PROFILE;
  }
}
