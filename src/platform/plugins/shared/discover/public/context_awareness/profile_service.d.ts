import type { AppliedProfile, ComposableAccessorParams, ComposableProfile, PartialProfile } from './composable_profile';
/**
 * Resolution result when the associated profile is a match
 */
interface ProfileResolutionMatch<TContext> {
    /**
     * `true` if the associated profile is a match
     */
    isMatch: true;
    /**
     * The resolved context associated with the profile
     */
    context: TContext;
}
/**
 * Resolution result when the associated profile is not a match
 */
interface ProfileResolutionMismatch {
    /**
     * `false` if the associated profile is not a match
     */
    isMatch: false;
}
/**
 * The profile provider resolution result
 */
type ResolveProfileResult<TContext> = ProfileResolutionMatch<TContext> | ProfileResolutionMismatch;
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
    /**
     * Profile available only if the registered product feature is active. Applies only to serverless deployments.
     * For more details, see the [Kibana Pricing Tiers service](./../../../../../../core/packages/pricing/server-internal/README.md).
     *
     * ```ts
     * restrictedToProductFeature: 'my-plugin:feature-name'
     * ```
     */
    restrictedToProductFeature?: string;
}
/**
 * A synchronous profile provider interface
 */
export interface ProfileProvider<TProfile extends PartialProfile, TParams, TContext> extends BaseProfileProvider<TProfile, TContext> {
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
export interface AsyncProfileProvider<TProfile extends PartialProfile, TParams, TContext> extends BaseProfileProvider<TProfile, TContext> {
    /**
     * The method responsible for context resolution and determining if the associated profile is a match
     * @param params Parameters specific to the provider context level
     * @returns The resolve profile result
     */
    resolve: (params: TParams) => ResolveProfileResult<TContext> | Promise<ResolveProfileResult<TContext>>;
}
/**
 * Context object with an injected profile ID
 */
export type ContextWithProfileId<TContext> = TContext & Pick<BaseProfileProvider<{}, {}>, 'profileId'>;
/**
 * Used to extract the profile type from a profile provider
 */
type ExtractProfile<TProvider> = TProvider extends BaseProfileProvider<infer TProfile, {}> ? TProfile : never;
/**
 * Used to extract the context type from a profile provider
 */
type ExtractContext<TProvider> = TProvider extends BaseProfileProvider<{}, infer TContext> ? TContext : never;
/**
 * Extract the resolution match type from a profile provider
 */
export type ExtractResolutionMatch<TProvider extends BaseProfileProvider<{}, {}>> = ProfileResolutionMatch<ExtractContext<TProvider>>;
/**
 * The base profile service implementation
 */
export declare abstract class BaseProfileService<TProvider extends BaseProfileProvider<TProfile, TContext>, TProfile extends PartialProfile = ExtractProfile<TProvider>, TContext = ExtractContext<TProvider>> {
    readonly defaultContext: ContextWithProfileId<TContext>;
    protected readonly providers: TProvider[];
    /**
     * @param defaultContext The default context object to use when no profile provider matches
     */
    protected constructor(defaultContext: ContextWithProfileId<TContext>);
    /**
     * Registers a profile provider
     * @param provider The profile provider to register
     */
    registerProvider(provider: TProvider): void;
    /**
     * Returns the profile associated with the provided context object
     * @param context A context object returned by a provider's `resolve` method
     * @returns The profile associated with the context
     */
    getProfile(params: ComposableAccessorParams<ContextWithProfileId<TContext>>): AppliedProfile;
}
/**
 * Used to extract the parameters type from a profile provider
 */
type ExtractParams<TProvider> = TProvider extends ProfileProvider<{}, infer P, {}> ? P : TProvider extends AsyncProfileProvider<{}, infer P, {}> ? P : never;
/**
 * A synchronous profile service implementation
 */
export declare class ProfileService<TProvider extends ProfileProvider<{}, TParams, TContext>, TParams = ExtractParams<TProvider>, TContext = ExtractContext<TProvider>> extends BaseProfileService<TProvider> {
    /**
     * Performs context resolution based on the provided context level parameters,
     * returning the resolved context from the first matching profile provider
     * @param params Parameters specific to the service context level
     * @returns The resolved context object with an injected profile ID
     */
    resolve(params: TParams): ContextWithProfileId<TContext>;
}
/**
 * An asynchronous profile service implementation
 */
export declare class AsyncProfileService<TProvider extends AsyncProfileProvider<{}, TParams, TContext>, TParams = ExtractParams<TProvider>, TContext = ExtractContext<TProvider>> extends BaseProfileService<TProvider> {
    /**
     * Performs context resolution based on the provided context level parameters,
     * returning the resolved context from the first matching profile provider
     * @param params Parameters specific to the service context level
     * @returns The resolved context object with an injected profile ID
     */
    resolve(params: TParams): Promise<ContextWithProfileId<TContext>>;
}
export {};
