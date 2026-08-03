import type { LocatorServicesDeps } from '.';
import type { DiscoverAppLocatorParams } from '../../common';
/**
 * @internal
 */
export declare const titleFromLocatorFactory: (services: LocatorServicesDeps) => (params: DiscoverAppLocatorParams) => Promise<string>;
export type TitleFromLocatorFn = ReturnType<typeof titleFromLocatorFactory>;
