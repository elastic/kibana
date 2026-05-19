import type { FeatureFlagsStart } from '..';
/**
 * The HTTP request handler context for evaluating feature flags
 */
export type FeatureFlagsRequestHandlerContext = Pick<FeatureFlagsStart, 'getBooleanValue' | 'getStringValue' | 'getNumberValue'>;
