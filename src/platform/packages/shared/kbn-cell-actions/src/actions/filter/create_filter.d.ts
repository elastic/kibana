import { type ExistsFilter, type Filter } from '@kbn/es-query';
import type { DefaultActionsSupportedValue } from '../types';
export declare const createExistsFilter: ({ key, negate, dataViewId, }: {
    key: string;
    negate: boolean;
    dataViewId?: string;
}) => ExistsFilter;
export declare const createFilter: ({ key, value, negate, dataViewId, }: {
    key: string;
    value: DefaultActionsSupportedValue;
    negate: boolean;
    dataViewId?: string;
}) => Filter;
