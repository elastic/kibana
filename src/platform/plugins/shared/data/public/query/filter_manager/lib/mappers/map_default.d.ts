import type { Filter } from '@kbn/es-query';
import { FILTERS } from '@kbn/es-query';
export declare const mapDefault: (filter: Filter) => {
    type: FILTERS;
    key: string;
    value: string;
};
