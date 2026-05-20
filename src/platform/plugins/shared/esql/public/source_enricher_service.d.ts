import type { Logger } from '@kbn/logging';
import type { ESQLSourceResult } from '@kbn/esql-types';
type SourceEnricher = (sources: ESQLSourceResult[]) => Promise<ESQLSourceResult[]>;
/**
 * Service to manage ES|QL source enrichers.
 * Enrichers are chained in registration order and applied to autocomplete source suggestions.
 */
export declare class SourceEnricherService {
    private readonly logger;
    private readonly enrichers;
    constructor(logger: Logger);
    register(enricher: SourceEnricher): void;
    enrich(sources: ESQLSourceResult[]): Promise<ESQLSourceResult[]>;
}
export {};
