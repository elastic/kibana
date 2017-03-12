import { createInitialQueryParametersState } from './state';


export const MAX_CONTEXT_SIZE = 10000; // Elasticsearch's default maximum size limit
export const MIN_CONTEXT_SIZE = 0;
export const QUERY_PARAMETER_KEYS = Object.keys(createInitialQueryParametersState());
