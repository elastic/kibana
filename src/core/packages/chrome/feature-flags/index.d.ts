import type { FeatureFlagsStart } from '@kbn/core-feature-flags-browser';
export declare const NEXT_CHROME_FEATURE_FLAG_KEY = "core.chrome.next";
export declare const NEXT_CHROME_SESSION_STORAGE_KEY = "dev.core.chrome.next";
type FeatureFlagsBooleanReader = Pick<FeatureFlagsStart, 'getBooleanValue'>;
export declare const isNextChrome: (featureFlags: FeatureFlagsBooleanReader) => boolean;
export declare const toggleNextChrome: (featureFlags: FeatureFlagsBooleanReader) => void;
export {};
