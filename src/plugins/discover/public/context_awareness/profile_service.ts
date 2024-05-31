/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable max-classes-per-file */

import type { ComposableProfile, PartialProfile } from './composable_profile';
import type { Profile } from './types';

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
  profileId: string;
  profile: ComposableProfile<TProfile>;
  resolve: (
    params: TParams
  ) => TMode extends 'sync'
    ? ResolveProfileResult<TContext>
    : ResolveProfileResult<TContext> | Promise<ResolveProfileResult<TContext>>;
}

export type ContextWithProfileId<TContext> = TContext & { profileId: string };

const EMPTY_PROFILE = {};

abstract class BaseProfileService<
  TProfile extends PartialProfile,
  TParams,
  TContext,
  TMode extends ProfileProviderMode
> {
  protected readonly providers: Array<ProfileProvider<TProfile, TParams, TContext, TMode>> = [];

  protected constructor(public readonly defaultContext: ContextWithProfileId<TContext>) {}

  public registerProvider(provider: ProfileProvider<TProfile, TParams, TContext, TMode>) {
    this.providers.push(provider);
  }

  public getProfile(context: ContextWithProfileId<TContext>): ComposableProfile<Profile> {
    const provider = this.providers.find((current) => current.profileId === context.profileId);
    return provider?.profile ?? EMPTY_PROFILE;
  }

  public abstract resolve(
    params: TParams
  ): TMode extends 'sync'
    ? ContextWithProfileId<TContext>
    : Promise<ContextWithProfileId<TContext>>;
}

export class ProfileService<
  TProfile extends PartialProfile,
  TParams,
  TContext
> extends BaseProfileService<TProfile, TParams, TContext, 'sync'> {
  public resolve(params: TParams) {
    for (const provider of this.providers) {
      const result = provider.resolve(params);

      if (result.isMatch) {
        return {
          ...result.context,
          profileId: provider.profileId,
        };
      }
    }

    return this.defaultContext;
  }
}

export class AsyncProfileService<
  TProfile extends PartialProfile,
  TParams,
  TContext
> extends BaseProfileService<TProfile, TParams, TContext, 'async'> {
  public async resolve(params: TParams) {
    for (const provider of this.providers) {
      const result = await provider.resolve(params);

      if (result.isMatch) {
        return {
          ...result.context,
          profileId: provider.profileId,
        };
      }
    }

    return this.defaultContext;
  }
}
