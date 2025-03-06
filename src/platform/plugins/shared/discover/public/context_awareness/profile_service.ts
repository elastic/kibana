/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable max-classes-per-file */

import { isFunction } from 'lodash';
import type {
  AppliedProfile,
  ComposableAccessorParams,
  ComposableProfile,
  PartialProfile,
} from './composable_profile';

/**
 * The profile provider resolution result
 */
type ResolveProfileResult<TContext> =
  | {
      /**
       * `true` if the associated profile is a match
       */
      isMatch: true;
      /**
       * The resolved context associated with the profile
       */
      context: TContext;
    }
  | {
      /**
       * `false` if the associated profile is not a match
       */
      isMatch: false;
    };

/**
 * The base profile provider interface
 */
export interface BaseProfileProvider<TProfile extends PartialProfile, TContext> {
  /**
   * The unique profile ID
   */
  profileId: string;
  /**
   * The composable profile implementation
   */
  profile: ComposableProfile<TProfile, TContext>;
  /**
   * Set the `isExperimental` flag to `true` for any profile which is under development and should not be enabled by default.
   *
   * Experimental profiles can be enabled in `kibana.yml` using `discover.experimental.enabledProfiles`, for example:
   *
   * ```yaml
   * discover.experimental.enabledProfiles:
   *   - example-root-profile
   *   - example-data-source-profile
   * ```
   */
  isExperimental?: boolean;
}

/**
 * A synchronous profile provider interface
 */
export interface ProfileProvider<TProfile extends PartialProfile, TParams, TContext>
  extends BaseProfileProvider<TProfile, TContext> {
  /**
   * The method responsible for context resolution and determining if the associated profile is a match
   * @param params Parameters specific to the provider context level
   * @returns The resolve profile result
   */
  resolve: (params: TParams) => ResolveProfileResult<TContext>;
}

/**
 * An asynchronous profile provider interface
 */
export interface AsyncProfileProvider<TProfile extends PartialProfile, TParams, TContext>
  extends BaseProfileProvider<TProfile, TContext> {
  /**
   * The method responsible for context resolution and determining if the associated profile is a match
   * @param params Parameters specific to the provider context level
   * @returns The resolve profile result
   */
  resolve: (
    params: TParams
  ) => ResolveProfileResult<TContext> | Promise<ResolveProfileResult<TContext>>;
}

/**
 * Context object with an injected profile ID
 */
export type ContextWithProfileId<TContext> = TContext &
  Pick<BaseProfileProvider<{}, {}>, 'profileId'>;

/**
 * Used to extract the profile type from a profile provider
 */
type ExtractProfile<TProvider> = TProvider extends BaseProfileProvider<infer TProfile, {}>
  ? TProfile
  : never;

/**
 * Used to extract the context type from a profile provider
 */
type ExtractContext<TProvider> = TProvider extends BaseProfileProvider<{}, infer TContext>
  ? TContext
  : never;

const EMPTY_PROFILE = {};

/**
 * The base profile service implementation
 */
export abstract class BaseProfileService<
  TProvider extends BaseProfileProvider<TProfile, TContext>,
  TProfile extends PartialProfile = ExtractProfile<TProvider>,
  TContext = ExtractContext<TProvider>
> {
  protected readonly providers: TProvider[] = [];

  /**
   * @param defaultContext The default context object to use when no profile provider matches
   */
  protected constructor(public readonly defaultContext: ContextWithProfileId<TContext>) {}

  /**
   * Registers a profile provider
   * @param provider The profile provider to register
   */
  public registerProvider(provider: TProvider) {
    this.providers.push(provider);
  }

  /**
   * Returns the profile associated with the provided context object
   * @param context A context object returned by a provider's `resolve` method
   * @returns The profile associated with the context
   */
  public getProfile(
    params: ComposableAccessorParams<ContextWithProfileId<TContext>>
  ): AppliedProfile {
    const provider = this.providers.find(
      (current) => current.profileId === params.context.profileId
    );

    if (!provider?.profile) {
      return EMPTY_PROFILE;
    }

    return new Proxy(provider.profile, {
      get: (target, prop, receiver) => {
        const accessor = Reflect.get(target, prop, receiver);

        if (!isFunction(accessor)) {
          return accessor;
        }

        return (prev: Parameters<typeof accessor>[0]) => accessor(prev, params);
      },
    }) as AppliedProfile;
  }
}

/**
 * Used to extract the parameters type from a profile provider
 */
type ExtractParams<TProvider> = TProvider extends ProfileProvider<{}, infer P, {}>
  ? P
  : TProvider extends AsyncProfileProvider<{}, infer P, {}>
  ? P
  : never;

/**
 * A synchronous profile service implementation
 */
export class ProfileService<
  TProvider extends ProfileProvider<{}, TParams, TContext>,
  TParams = ExtractParams<TProvider>,
  TContext = ExtractContext<TProvider>
> extends BaseProfileService<TProvider> {
  /**
   * Performs context resolution based on the provided context level parameters,
   * returning the resolved context from the first matching profile provider
   * @param params Parameters specific to the service context level
   * @returns The resolved context object with an injected profile ID
   */
  public resolve(params: TParams): ContextWithProfileId<TContext> {
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

/**
 * An asynchronous profile service implementation
 */
export class AsyncProfileService<
  TProvider extends AsyncProfileProvider<{}, TParams, TContext>,
  TParams = ExtractParams<TProvider>,
  TContext = ExtractContext<TProvider>
> extends BaseProfileService<TProvider> {
  /**
   * Performs context resolution based on the provided context level parameters,
   * returning the resolved context from the first matching profile provider
   * @param params Parameters specific to the service context level
   * @returns The resolved context object with an injected profile ID
   */
  public async resolve(params: TParams): Promise<ContextWithProfileId<TContext>> {
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
