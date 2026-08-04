import type { Query } from '@kbn/es-query';
import type { LensApiFilterType } from '../../schema/filter';
type LensStateFilterLanguage = 'kuery' | 'lucene';
type ApiFilterLanguage = LensApiFilterType['language'];
export declare const toLensStateFilterLanguage: (language: ApiFilterLanguage | string) => LensStateFilterLanguage;
export declare const toApiFilterLanguage: (language: LensStateFilterLanguage | string) => ApiFilterLanguage;
export declare function fromFilterAPIToLensState(filter: LensApiFilterType | undefined): Query | undefined;
export declare function fromFilterLensStateToAPI({ query, language, }: Query): LensApiFilterType | undefined;
export declare const DEFAULT_FILTER: {
    expression: string;
    language: "lucene" | "kql";
};
export {};
