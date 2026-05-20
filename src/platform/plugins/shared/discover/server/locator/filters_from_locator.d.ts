import type { Filter } from '@kbn/es-query';
import type { LocatorServicesDeps } from '.';
import type { DiscoverAppLocatorParams } from '../../common';
/**
 * @internal
 */
export declare const filtersFromLocatorFactory: (services: LocatorServicesDeps) => (params: DiscoverAppLocatorParams) => Promise<Filter[]>;
export type FiltersFromLocatorFn = ReturnType<typeof filtersFromLocatorFactory>;
