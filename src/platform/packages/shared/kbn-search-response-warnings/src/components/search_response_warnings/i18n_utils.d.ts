import type { SearchResponseWarning } from '../../types';
export declare const viewDetailsLabel: string;
export declare function getNonSuccessfulClusters(warnings: SearchResponseWarning[]): Set<string>;
export declare function getWarningsTitle(warnings: SearchResponseWarning[]): string;
export declare function getWarningsDescription(warnings: SearchResponseWarning[]): string;
