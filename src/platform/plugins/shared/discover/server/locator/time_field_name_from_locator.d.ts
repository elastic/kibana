import type { LocatorServicesDeps } from '.';
import type { DiscoverAppLocatorParams } from '../../common';
/**
 * @internal
 */
export declare const timeFieldNameFromLocatorFactory: (services: LocatorServicesDeps) => (params: DiscoverAppLocatorParams) => Promise<string | undefined>;
export type TimeFieldNameFromLocatorFn = ReturnType<typeof timeFieldNameFromLocatorFactory>;
