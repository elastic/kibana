import type { DataViewBase, Query } from '@kbn/es-query';
export declare const validateQuery: (input: Query | undefined, dataView: DataViewBase) => {
    isValid: boolean;
    error: string | undefined;
};
export declare const isQueryValid: (input: Query, dataView: DataViewBase) => boolean;
