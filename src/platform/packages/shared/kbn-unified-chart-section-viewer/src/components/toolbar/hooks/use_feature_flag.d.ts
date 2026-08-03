import type { FeatureFlag } from '../../../common/constants';
/**
 * Reactively evaluates a boolean feature flag from the host's `featureFlags` service
 * (see {@link FEATURE_FLAGS} for the available keys). Falls back to
 * `fallbackValue` when the host hasn't provided a `featureFlags` service (e.g. in
 * tests) so consumers don't have to special-case its absence.
 */
export declare const useFeatureFlag: (flagName: FeatureFlag, fallbackValue: boolean) => boolean;
