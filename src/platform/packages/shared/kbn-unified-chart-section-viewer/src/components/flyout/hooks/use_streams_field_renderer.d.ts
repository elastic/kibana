import type { ObservabilityStreamsFeature } from '@kbn/discover-shared-plugin/public';
/**
 * Returns the streams plugin's `renderFlyoutStreamFieldByStreamName` if the
 * feature is registered with the discoverShared registry; otherwise
 * `undefined`. The renderer produces a stream field/section to be embedded
 * inside the flyout (not the flyout itself).
 */
export declare const useStreamsFieldRenderer: () => ObservabilityStreamsFeature["renderFlyoutStreamFieldByStreamName"] | undefined;
