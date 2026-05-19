import type { Profile } from './types';
/**
 * A partial profile implementation
 */
export type PartialProfile = Partial<Profile>;
/**
 * The parameters passed to a composable accessor, such as the current context object
 */
export interface ComposableAccessorParams<TContext> {
    /**
     * The current context object
     */
    context: TContext;
}
/**
 * An accessor function that allows retrieving the extension point result from previous profiles
 */
type ComposableAccessor<TPrev, TContext> = (prev: TPrev, params: ComposableAccessorParams<TContext>) => TPrev;
/**
 * A partial profile implementation that supports composition across multiple profiles
 */
export type ComposableProfile<TProfile extends PartialProfile, TContext> = {
    [TKey in keyof TProfile]?: ComposableAccessor<TProfile[TKey], TContext>;
};
/**
 * A partially applied accessor function with parameters bound to a specific context
 */
type AppliedAccessor<TPrev> = (prev: TPrev) => TPrev;
/**
 * A partial profile implementation with applied accessors
 */
export type AppliedProfile = {
    [TKey in keyof Profile]?: AppliedAccessor<Profile[TKey]>;
};
/**
 * Merges extension point implementations from multiple profiles into a single accessor function
 * @param profiles The profiles to merge
 * @param key The key of the extension point to merge
 * @param baseImpl The base implementation for the extension point
 * @returns The merged extension point accessor function
 */
export declare const getMergedAccessor: <TKey extends keyof Profile>(profiles: AppliedProfile[], key: TKey, baseImpl: Profile[TKey]) => Profile[TKey];
export {};
