import type { Logger } from '@kbn/logging';
type Enricher<T> = (items: T[]) => Promise<T[]>;
/**
 * Generic service to manage ES|QL autocomplete enrichers.
 * Enrichers are chained in registration order and applied to autocomplete suggestions.
 */
export declare class EnricherService<T> {
    private readonly logger;
    private readonly errorType;
    private readonly enrichers;
    constructor(logger: Logger, errorType: string);
    register(enricher: Enricher<T>): void;
    enrich(items: T[]): Promise<T[]>;
}
export {};
