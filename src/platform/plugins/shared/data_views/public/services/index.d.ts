import type { HttpStart } from '@kbn/core/public';
import type { MatchedItem } from '../types';
export * from './has_data';
export declare function getIndices(props: {
    http: HttpStart;
    pattern: string;
    showAllIndices?: boolean;
    isRollupIndex: (indexName: string) => boolean;
    projectRouting?: string;
}): Promise<MatchedItem[]>;
