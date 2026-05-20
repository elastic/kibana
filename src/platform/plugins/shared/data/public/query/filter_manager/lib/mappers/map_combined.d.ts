import type { Filter } from '@kbn/es-query';
export declare const mapCombined: (filter: Filter) => {
    type: import("@kbn/es-query").FILTERS.COMBINED;
    key: string | undefined;
    params: Filter[];
};
