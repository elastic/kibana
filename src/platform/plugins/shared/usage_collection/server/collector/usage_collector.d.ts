import type { Logger } from '@kbn/core/server';
import type { CollectorOptions } from './types';
import { Collector } from './collector';
/**
 * Same as {@link CollectorOptions} but with the `schema` property enforced
 */
export type UsageCollectorOptions<TFetchReturn = unknown, ExtraOptions extends object = {}> = CollectorOptions<TFetchReturn, ExtraOptions> & Required<Pick<CollectorOptions<TFetchReturn>, 'schema'>>;
/**
 * @internal Only used in fixtures as a type
 */
export declare class UsageCollector<TFetchReturn, ExtraOptions extends object = {}> extends Collector<TFetchReturn, ExtraOptions> {
    constructor(log: Logger, collectorOptions: UsageCollectorOptions<TFetchReturn, ExtraOptions>);
}
