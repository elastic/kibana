import type { SearchSource } from '@kbn/data-plugin/common';
import type { LocatorServicesDeps } from '.';
import type { DiscoverAppLocatorParams } from '../../common';
/**
 * @internal
 */
export declare function searchSourceFromLocatorFactory(services: LocatorServicesDeps): (params: DiscoverAppLocatorParams) => Promise<SearchSource>;
export type SearchSourceFromLocatorFn = ReturnType<typeof searchSourceFromLocatorFactory>;
