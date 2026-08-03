import type { AggregateQuery, Query } from '@kbn/es-query';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
/**
 * Determines if saving queries is allowed within the saved query management popover (still requires privileges).
 * This does not impact if queries can be loaded, which is determined by the saved query management read privilege.
 */
export declare const canShowSavedQuery: ({ allowSavingQueries, query, core, }: {
    allowSavingQueries?: boolean;
    query: AggregateQuery | Query | {
        [key: string]: any;
    };
    core: CoreStart;
}) => boolean;
