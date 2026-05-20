import type { Reference } from '@kbn/content-management-utils';
import type { SerializedVis } from '../types';
import type { StoredVis } from '../embeddable/transforms/types';
export declare const DISCOVER_SESSION_REF_NAME = "search_0";
export declare function extractVisReferences(savedVis: SerializedVis): {
    savedVis: StoredVis;
    references: Reference[];
};
