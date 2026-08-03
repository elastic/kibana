import type { HttpStart, SavedObjectsFindOptionsReference } from '@kbn/core/public';
export declare function fetchExportByTypeAndSearch({ http, search, types, references, includeReferencesDeep, }: {
    http: HttpStart;
    types: string[];
    search?: string;
    references?: SavedObjectsFindOptionsReference[];
    includeReferencesDeep?: boolean;
}): Promise<Blob>;
