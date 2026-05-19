import type { RecommendedQuery, RecommendedField, ResolveIndexResponse, ESQLRegistrySolutionId } from '@kbn/esql-types';
/**
 * `ESQLExtensionsRegistry` serves as a central hub for managing and retrieving extrensions of the ES|QL editor.
 *
 * It allows for the registration of queries and fields associating them with specific index patterns and solutions.
 * This registry is designed to intelligently provide relevant recommended queries and fields
 * based on the index patterns present in an active ES|QL query or available data sources.
 *
 * The class handles both exact index pattern matches (e.g., "logs-2023-10-01")
 * and wildcard patterns (e.g., "logs*"), ensuring that users receive contextually
 * appropriate suggestions for their data exploration.
 */
export declare class ESQLExtensionsRegistry {
    private recommendedQueries;
    private recommendedFields;
    private sourceCommandCache;
    private setRecommendedItems;
    private getRecommendedItems;
    setRecommendedQueries(recommendedQueries: RecommendedQuery[], activeSolutionId: ESQLRegistrySolutionId): void;
    getRecommendedQueries(queryString: string, availableDatasources: ResolveIndexResponse, activeSolutionId: ESQLRegistrySolutionId): RecommendedQuery[];
    unsetRecommendedQueries(recommendedQueries: RecommendedQuery[], activeSolutionId: ESQLRegistrySolutionId): void;
    setRecommendedFields(recommendedFields: RecommendedField[], activeSolutionId: ESQLRegistrySolutionId): void;
    getRecommendedFields(queryString: string, availableDatasources: ResolveIndexResponse, activeSolutionId: ESQLRegistrySolutionId): RecommendedField[];
}
