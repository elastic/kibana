import type { CoreStart } from '@kbn/core/public';
import { type ESQLSourceResult } from '@kbn/esql-types';
import type { ILicense } from '@kbn/licensing-types';
/**
 * Fetches the list of indices, aliases, and data streams from the Elasticsearch cluster.
 * @param core The core start contract to make HTTP requests.
 * @param areRemoteIndicesAvailable A boolean indicating if remote indices should be included.
 * @param signal Optional AbortSignal to cancel the request.
 * @returns A promise that resolves to an array of ESQLSourceResult objects.
 */
export declare const getIndicesList: (core: Pick<CoreStart, "http">, areRemoteIndicesAvailable: boolean, signal?: AbortSignal) => Promise<ESQLSourceResult[]>;
/** Fetches ESQL sources including indices, aliases, data streams, and integrations.
 * @param core The core start contract to make HTTP requests and access application capabilities.
 * @param getLicense An optional function to retrieve the current license information.
 * @param signal Optional AbortSignal to cancel the request.
 * @returns A promise that resolves to an array of ESQLSourceResult objects.
 */
export declare const getESQLSources: (core: Pick<CoreStart, "application" | "http">, getLicense: (() => Promise<ILicense | undefined>) | undefined, signal?: AbortSignal) => Promise<ESQLSourceResult[]>;
