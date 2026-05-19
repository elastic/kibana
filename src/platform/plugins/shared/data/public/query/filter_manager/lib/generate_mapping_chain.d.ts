import type { Filter } from '@kbn/es-query';
export declare const generateMappingChain: (fn: Function, next?: Function) => (filter: Filter) => any;
