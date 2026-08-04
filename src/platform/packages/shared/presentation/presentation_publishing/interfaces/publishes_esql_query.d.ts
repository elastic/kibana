import type { AggregateQuery } from '@kbn/es-query';
import type { PublishingSubject } from '../publishing_subject';
export interface PublishesESQLQuery {
    query$: PublishingSubject<AggregateQuery>;
}
/**
 * Type guard to check if an embeddable publishes an ES|QL query.
 * The `in` operator throws if the right-hand side is not an object, so we must guard against that.
 */
export declare const apiPublishesESQLQuery: (api: unknown) => api is PublishesESQLQuery;
