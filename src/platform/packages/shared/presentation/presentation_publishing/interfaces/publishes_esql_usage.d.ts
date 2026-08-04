import type { PublishingSubject } from '../publishing_subject';
/**
 * For embeddables that can use ES|QL internally without necessarily publishing
 * an ES|QL `query$` (e.g. a Vega spec with one or more ES|QL data sources).
 */
export interface PublishesEsqlUsage {
    usesEsql$: PublishingSubject<boolean>;
}
export declare const apiPublishesEsqlUsage: (unknownApi: unknown) => unknownApi is PublishesEsqlUsage;
