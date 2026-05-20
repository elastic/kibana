import type { CoreSetup, Plugin } from '@kbn/core/server';
import type { Filter } from '@kbn/es-query';
import type { PersistableStateService } from '@kbn/kibana-utils-plugin/common';
import type { QueryState } from '../../common';
export interface QuerySetup extends PersistableStateService<QueryState> {
    filterManager: PersistableStateService<Filter[]>;
}
/**
 * @internal
 */
export declare class QueryService implements Plugin<void> {
    setup(core: CoreSetup): QuerySetup;
    start(): void;
}
