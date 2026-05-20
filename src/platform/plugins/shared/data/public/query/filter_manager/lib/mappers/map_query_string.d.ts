import type { Filter } from '@kbn/es-query';
import { FILTERS } from '@kbn/es-query';
export declare const mapQueryString: (filter: Filter) => {
    type: FILTERS;
    key: string;
    value: string | undefined;
};
