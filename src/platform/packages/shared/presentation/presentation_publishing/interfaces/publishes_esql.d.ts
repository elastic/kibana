import type { AggregateQuery } from '@kbn/es-query';
import type { PublishingSubject } from '../publishing_subject';
/**
 * For embeddables that can use ES|QL internally without necessarily publishing
 * an ES|QL `query$` (e.g. a Vega spec with one or more ES|QL data sources).
 */
export interface PublishesEsql {
    /** Emits the ES|QL queries currently executed by the embeddable — empty array when not in ES|QL mode. */
    esql$: PublishingSubject<AggregateQuery[]>;
    /** Emits the `approximation_applied` flag from the most recent ES|QL response — `true` if Elasticsearch applied approximate execution, `false` if it ran exactly, or `undefined` before the first response or when the panel is not in ES|QL mode. */
    approximationApplied$: PublishingSubject<boolean | undefined>;
}
export declare const apiPublishesEsql: (unknownApi: unknown) => unknownApi is PublishesEsql;
export declare function useHasEsqlPanel(parentApi: unknown): boolean;
