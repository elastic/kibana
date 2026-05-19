import type { ResolveIndexResponse } from '@kbn/esql-types';
/**
 * Returns a boolean if the pattern exists in the sources.
 * @param pattern The pattern string (e.g., "logs*", "my_index").
 * @param sources The ResolveIndexResponse object containing indices, aliases, and data streams.
 * @returns A boolean indicating if the pattern exists in the sources.
 */
export declare function checkSourceExistence(sources: ResolveIndexResponse, inputString: string): boolean;
/**
 * Finds matches from the registry, given a pattern.
 * @param registry The registry map containing index names and their corresponding queries.
 * @param pattern The pattern string (e.g., "logs*", "my_index", "logs-02122024").
 * @returns An array of matching index names.
 */
export declare function findMatchingIndicesFromPattern<T>(registry: Map<string, T[]>, indexPattern: string): string[];
