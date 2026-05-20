import type { Filter } from '@kbn/es-query';
import type { FILTERS } from '@kbn/es-query';
export declare const mapQueryString: (filter: Filter) => {
    type: FILTERS;
    key: string;
    value: string | undefined;
};
