import type { IndicesGetMappingResponse } from '@elastic/elasticsearch/lib/api/types';
import type { HttpSetup } from '@kbn/core-http-browser';
import { type Settings } from '../../services';
import type { AutoCompleteContext } from '../autocomplete/types';
import type { Field } from './types';
export interface BaseMapping {
    perIndexTypes: Partial<Record<string, Record<string, Field[]>>>;
    /**
     * Fetches mappings definition
     */
    fetchMappings(index: string): Promise<IndicesGetMappingResponse>;
    /**
     * Retrieves mappings definition from cache, fetches if necessary.
     */
    getMappings(indices?: string | string[], types?: string | string[], autoCompleteContext?: AutoCompleteContext): Field[];
    /**
     * Stores mappings definition
     * @param mappings
     */
    loadMappings(mappings: Record<string, {
        mappings?: unknown;
        properties?: unknown;
    }>): void;
    clearMappings(): void;
}
export declare class Mapping implements BaseMapping {
    private http;
    private settings;
    /**
     * Map of the mappings of actual ES indices.
     */
    perIndexTypes: Partial<Record<string, Record<string, Field[]>>>;
    /**
     * Map of the user-input wildcards and actual indices.
     */
    perWildcardIndices: Record<string, string[]>;
    private readonly _isLoading$;
    /**
     * Indicates if mapping fetching is in progress.
     */
    readonly isLoading$: import("rxjs").Observable<boolean>;
    /**
     * Map of the currently loading mappings for index patterns specified by a user.
     * @internal
     */
    private loadingState;
    setup(http: HttpSetup, settings: Settings): void;
    private getRequiredHttp;
    private getRequiredSettings;
    /**
     * Fetches mappings of the requested indices.
     * @param index
     */
    fetchMappings(index: string): Promise<IndicesGetMappingResponse>;
    getMappings: (indices?: string | string[], types?: string | string[], autoCompleteContext?: AutoCompleteContext) => Field[];
    loadMappings: (mappings: Record<string, {
        mappings?: unknown;
        properties?: unknown;
    }>) => void;
    clearMappings: () => void;
}
