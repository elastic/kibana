/**
 * Chrome Next rollout APIs.
 *
 * @remarks
 * This namespace starts with the rollout state and will host additional Chrome Next APIs as
 * follow-up feature slices land behind the same flag.
 *
 * @public
 */
export interface ChromeNext {
    /** Whether the Chrome Next feature flag is enabled. */
    readonly isEnabled: boolean;
}
