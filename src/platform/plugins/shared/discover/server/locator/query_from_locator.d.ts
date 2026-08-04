import type { AggregateQuery, Query } from '@kbn/es-query';
import type { LocatorServicesDeps } from '.';
import type { DiscoverAppLocatorParams } from '../../common';
/**
 * @internal
 */
export declare const queryFromLocatorFactory: (services: LocatorServicesDeps) => (params: DiscoverAppLocatorParams) => Promise<Query | AggregateQuery | undefined>;
export type QueryFromLocatorFn = ReturnType<typeof queryFromLocatorFactory>;
