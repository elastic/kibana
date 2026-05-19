import type { IndexAutocompleteItem, EsqlDataset, EsqlView } from '@kbn/esql-types';
import type { EditorError } from '@elastic/esql/types';
import type { ESQLColumnData } from '../../commands/registry/types';
import type { ESQLPolicy } from '../../commands/registry/types';
import type { ESQLMessage } from '../../commands';
export interface ReferenceMaps {
    sources: Set<string>;
    columns: Map<string, ESQLColumnData>;
    policies: Map<string, ESQLPolicy>;
    query: string;
    joinIndices: IndexAutocompleteItem[];
    timeSeriesSources?: IndexAutocompleteItem[];
    views?: EsqlView[];
    datasets?: EsqlDataset[];
}
export interface ValidationResult {
    errors: Array<ESQLMessage | EditorError>;
    warnings: ESQLMessage[];
}
export interface ValidationOptions {
    /**
     * Forces cache invalidation for column metadata.
     * Only effective when 'getColumnsFor' callback is provided in ESQLCallbacks.
     * Use when schema changes have occurred (e.g., new fields added to lookup indices).
     * @default false
     */
    invalidateColumnsCache?: boolean;
}
