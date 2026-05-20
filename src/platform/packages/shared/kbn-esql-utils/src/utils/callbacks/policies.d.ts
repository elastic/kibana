import type { HttpStart } from '@kbn/core/public';
import type { SerializedEnrichPolicy } from '@kbn/index-management-shared-types';
type EsqlPolicy = Omit<SerializedEnrichPolicy, 'type' | 'query'>;
/**
 * Fetches the list of enrich policies from the server, formatted as EsqlPolicy objects.
 * @param http The HTTP service to use for the request.
 * @returns A promise that resolves to an array of EsqlPolicy objects.
 */
export declare const getEsqlPolicies: (http: HttpStart) => Promise<EsqlPolicy[]>;
export {};
