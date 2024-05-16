/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable max-classes-per-file */

import { ComposableProfile, PartialProfile, Profile } from './composable_profile';

export type ResolveProfileResult<TContext> =
  | { isMatch: true; context: TContext }
  | { isMatch: false };

export type ProfileProviderMode = 'sync' | 'async';

export interface ProfileProvider<
  TProfile extends PartialProfile,
  TParams,
  TContext,
  TMode extends ProfileProviderMode
> {
  order: number;
  profile: ComposableProfile<TProfile>;
  resolve: (
    params: TParams
  ) => TMode extends 'sync'
    ? ResolveProfileResult<TContext>
    : ResolveProfileResult<TContext> | Promise<ResolveProfileResult<TContext>>;
}

abstract class BaseProfileService<
  TProfile extends PartialProfile,
  TParams,
  TContext,
  TMode extends ProfileProviderMode
> {
  protected readonly providers: Array<ProfileProvider<TProfile, TParams, TContext, TMode>> = [];

  public registerProvider(provider: ProfileProvider<TProfile, TParams, TContext, TMode>) {
    this.providers.push(provider);
    this.providers.sort((a, b) => a.order - b.order);
  }

  public abstract resolve(
    params: TParams
  ): TMode extends 'sync' ? ComposableProfile<Profile> : Promise<ComposableProfile<Profile>>;
}

const EMPTY_PROFILE = {};

export class ProfileService<
  TProfile extends PartialProfile,
  TParams,
  TContext
> extends BaseProfileService<TProfile, TParams, TContext, 'sync'> {
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

export class AsyncProfileService<
  TProfile extends PartialProfile,
  TParams,
  TContext
> extends BaseProfileService<TProfile, TParams, TContext, 'async'> {
  public async resolve(params: TParams): Promise<ComposableProfile<Profile>> {
    for (const provider of this.providers) {
      const result = await provider.resolve(params);

      if (result.isMatch) {
        return provider.profile as ComposableProfile<Profile>;
      }
    }

    return EMPTY_PROFILE;
  }
}
