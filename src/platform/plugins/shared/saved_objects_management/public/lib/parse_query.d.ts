import type { Query } from '@elastic/eui';
import type { SavedObjectManagementTypeInfo } from '../../common';
interface ParsedQuery {
    queryText?: string;
    visibleTypes?: string[];
    selectedTags?: string[];
}
export declare function parseQuery(query: Query, types: SavedObjectManagementTypeInfo[]): ParsedQuery;
export {};
