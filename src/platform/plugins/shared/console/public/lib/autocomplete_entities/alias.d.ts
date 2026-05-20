import type { IndicesGetAliasResponse } from '@elastic/elasticsearch/lib/api/types';
import type { BaseMapping } from './mapping';
interface BaseAlias {
    getIndices(includeAliases: boolean, collaborator: BaseMapping): string[];
    loadAliases(aliases: IndicesGetAliasResponse, collaborator: BaseMapping): void;
    clearAliases(): void;
}
export declare class Alias implements BaseAlias {
    perAliasIndexes: Record<string, string[]>;
    getIndices: (includeAliases: boolean, collaborator: BaseMapping) => string[];
    loadAliases: (aliases: IndicesGetAliasResponse, collaborator: BaseMapping) => void;
    clearAliases: () => void;
}
export {};
