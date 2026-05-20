import type { HttpStart } from '@kbn/core/public';
import type { Tag } from '../types';
import type { MatchedItem, ResolveIndexResponse } from '../types';
export declare const getIndicesViaResolve: ({ http, pattern, showAllIndices, isRollupIndex, projectRouting, }: {
    http: HttpStart;
    pattern: string;
    showAllIndices: boolean;
    isRollupIndex: (indexName: string) => boolean;
    projectRouting?: string;
}) => Promise<MatchedItem[]>;
export declare function getIndices({ http, pattern: rawPattern, showAllIndices, isRollupIndex, projectRouting, }: {
    http: HttpStart;
    pattern: string;
    showAllIndices?: boolean;
    isRollupIndex: (indexName: string) => boolean;
    projectRouting?: string;
}): Promise<MatchedItem[]>;
export declare const responseToItemArray: (response: ResolveIndexResponse, getTags: (indexName: string) => Tag[]) => MatchedItem[];
