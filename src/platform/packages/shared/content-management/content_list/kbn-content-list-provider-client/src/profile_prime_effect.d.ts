import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
/**
 * Props for {@link ProfilePrimeEffect}.
 */
interface ProfilePrimeEffectProps {
    getItems: () => UserContentCommonSchema[];
}
/**
 * Side-effect component that primes the shared {@link ProfileCache} with
 * UIDs from the full cached item universe when the parsed query model
 * references a user-profile field with unresolved values (e.g. `createdBy:alice`).
 *
 * This ensures fuzzy resolution via `resolveFuzzyDisplayToIds` over
 * `cache.getAll()` has the profiles it needs. The cache's internal
 * `requested` set makes `ensureLoaded` idempotent — no external version
 * tracking or dedup logic needed.
 *
 * Renders nothing — exists only for side-effects.
 */
export declare const ProfilePrimeEffect: ({ getItems }: ProfilePrimeEffectProps) => null;
export {};
