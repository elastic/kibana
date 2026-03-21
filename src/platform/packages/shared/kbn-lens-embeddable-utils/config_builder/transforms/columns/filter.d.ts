import type { Query } from '@kbn/es-query';
import type { LensApiFilterType } from '../../schema/filter';
export declare function fromFilterAPIToLensState(filter: LensApiFilterType | undefined): Query | undefined;
export declare function fromFilterLensStateToAPI(filter: Query): LensApiFilterType | undefined;
export declare const DEFAULT_FILTER: {
    query: string;
    language: "kuery" | "lucene";
};
