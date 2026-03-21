import type { Filter } from '@kbn/es-query';
import { FILTERS } from '@kbn/es-query';
export declare const mapExists: (filter: Filter) => {
    type: FILTERS;
    value: FILTERS;
    key: string | undefined;
};
